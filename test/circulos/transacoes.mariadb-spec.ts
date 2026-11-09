import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TypeOrmCriarCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-criar-circulo-transacional.repository.js';
import { TypeOrmRemoverMembroTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-remover-membro-transacional.repository.js';
import { TypeOrmRenovarCodigoConviteTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-renovar-codigo-convite-transacional.repository.js';
import { CirculoOrmEntity } from '../../src/modules/circulos/infrastructure/persistence/typeorm/entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../../src/modules/circulos/infrastructure/persistence/typeorm/entities/membro-circulo.orm-entity.js';
import { BloqueioCirculoOrmEntity } from '../../src/modules/circulos/infrastructure/persistence/typeorm/entities/bloqueio-circulo.orm-entity.js';
import {
  criarFixtureCirculos,
  type FixtureCirculos,
} from './circulos-fixture.js';

describe('Círculos no MariaDB — integração', () => {
  let fixture: FixtureCirculos;

  beforeAll(async () => {
    fixture = await criarFixtureCirculos();
  }, 30_000);
  afterAll(async () => {
    await fixture?.fechar();
  });

  it('grava o círculo e o administrador inicial na mesma operação', async () => {
    const { db } = fixture;
    const usuario = await fixture.criarUsuario();
    const repositorio = new TypeOrmCriarCirculoTransacionalRepository(db);
    const dados = {
      nome: 'Criação transacional',
      codigoConvite: randomBytes(5).toString('hex').toUpperCase(),
      criadorId: usuario.id,
    };

    const resultado = await repositorio.criarComAdministrador(dados);
    if (resultado.status !== 'CIRCULO_CRIADO') {
      throw new Error(`Criação retornou ${resultado.status}`);
    }
    const { id } = resultado.circulo;
    fixture.rastrearCirculo(id);
    expect(
      await db.getRepository(CirculoOrmEntity).findOneBy({ id }),
    ).toMatchObject({
      nome: dados.nome,
      codigoConvite: dados.codigoConvite,
      deletedAt: null,
    });
    expect(
      await db.getRepository(MembroCirculoOrmEntity).findBy({ circuloId: id }),
    ).toEqual([
      expect.objectContaining({
        usuarioId: usuario.id,
        funcao: 'ADMINISTRADOR',
      }),
    ]);
  });

  it('reverte a inserção do círculo quando a FK rejeita o administrador', async () => {
    const { db } = fixture;
    const codigoConvite = randomBytes(5).toString('hex').toUpperCase();
    const repositorio = new TypeOrmCriarCirculoTransacionalRepository(db);

    await expect(
      repositorio.criarComAdministrador({
        nome: 'Criação revertida',
        codigoConvite,
        criadorId: '0',
      }),
    ).rejects.toMatchObject({
      driverError: { code: 'ER_NO_REFERENCED_ROW_2' },
    });
    expect(
      await db.getRepository(CirculoOrmEntity).count({
        where: { codigoConvite },
        withDeleted: true,
      }),
    ).toBe(0);
  });

  it('preserva o membro e reverte o bloqueio se o DELETE falhar', async () => {
    const { db, api } = fixture;
    const admin = await fixture.criarUsuario();
    const usuario = await fixture.criarUsuario();
    const { id, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );
    await api
      .post('/circulos/entrar')
      .set('Authorization', usuario.authorization)
      .send({ codigoConvite })
      .expect(201);
    const filtro = { circuloId: id, usuarioId: usuario.id };
    const repositorio = new TypeOrmRemoverMembroTransacionalRepository(db);
    const trigger = `circulos_teste_${randomBytes(6).toString('hex')}`;
    const membro = await db
      .getRepository(MembroCirculoOrmEntity)
      .findOneByOrFail(filtro);

    // O erro vem do MariaDB, depois do INSERT de bloqueio feito pelo repositório.
    const membroId = BigInt(membro.id).toString();
    await db.query(`
      CREATE TRIGGER ${trigger} BEFORE DELETE ON membro_do_circulo
      FOR EACH ROW BEGIN
        IF OLD.id_membro = ${membroId} THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'falha de remoção para testar rollback';
        END IF;
      END
    `);
    try {
      await expect(
        repositorio.remover(id, admin.id, usuario.id),
      ).rejects.toMatchObject({ driverError: { code: 'ER_SIGNAL_EXCEPTION' } });
      expect(
        await db.getRepository(MembroCirculoOrmEntity).findOneBy(filtro),
      ).toEqual(membro);
      expect(
        await db.getRepository(BloqueioCirculoOrmEntity).countBy(filtro),
      ).toBe(0);
    } finally {
      await db.query(`DROP TRIGGER ${trigger}`);
    }

    expect(await repositorio.remover(id, admin.id, usuario.id)).toBe(
      'MEMBRO_REMOVIDO',
    );
    expect(await db.getRepository(MembroCirculoOrmEntity).countBy(filtro)).toBe(
      0,
    );
    expect(
      await db.getRepository(BloqueioCirculoOrmEntity).findBy(filtro),
    ).toEqual([expect.objectContaining({ bloqueadoPorId: admin.id })]);
  });

  it('rejeita código duplicado mesmo após desativação e mantém o código anterior', async () => {
    const { db, api } = fixture;
    const admin = await fixture.criarUsuario();
    const primeiro = await fixture.criarCirculo(admin.authorization);
    const segundo = await fixture.criarCirculo(admin.authorization);
    const criacao = new TypeOrmCriarCirculoTransacionalRepository(db);
    const renovacao = new TypeOrmRenovarCodigoConviteTransacionalRepository(db);
    await api
      .delete(segundo.caminho)
      .set('Authorization', admin.authorization)
      .expect(204);

    expect(
      await criacao.criarComAdministrador({
        nome: 'Colisão',
        codigoConvite: segundo.codigoConvite,
        criadorId: admin.id,
      }),
    ).toEqual({ status: 'CODIGO_CONVITE_DUPLICADO' });
    expect(
      await renovacao.renovar(primeiro.id, admin.id, segundo.codigoConvite),
    ).toEqual({ status: 'CODIGO_CONVITE_DUPLICADO' });
    expect(
      await db.getRepository(CirculoOrmEntity).findOneBy({ id: primeiro.id }),
    ).toMatchObject({ codigoConvite: primeiro.codigoConvite });
  });

  it('impõe unicidade de participação e de bloqueio no próprio banco', async () => {
    const { db } = fixture;
    const admin = await fixture.criarUsuario();
    const usuario = await fixture.criarUsuario();
    const { id } = await fixture.criarCirculo(admin.authorization);
    const membros = db.getRepository(MembroCirculoOrmEntity);
    const bloqueios = db.getRepository(BloqueioCirculoOrmEntity);

    await expect(
      membros.insert({ circuloId: id, usuarioId: admin.id }),
    ).rejects.toMatchObject({ driverError: { code: 'ER_DUP_ENTRY' } });
    expect(await membros.countBy({ circuloId: id, usuarioId: admin.id })).toBe(
      1,
    );

    const dados = {
      circuloId: id,
      usuarioId: usuario.id,
      bloqueadoPorId: admin.id,
    };
    await bloqueios.insert(dados);
    await expect(bloqueios.insert(dados)).rejects.toMatchObject({
      driverError: { code: 'ER_DUP_ENTRY' },
    });
    expect(
      await bloqueios.countBy({ circuloId: id, usuarioId: usuario.id }),
    ).toBe(1);
  });
});
