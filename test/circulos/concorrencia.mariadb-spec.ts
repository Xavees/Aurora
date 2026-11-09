import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TypeOrmAlterarFuncaoMembroTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-alterar-funcao-membro-transacional.repository.js';
import { TypeOrmEntrarCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-entrar-circulo-transacional.repository.js';
import { TypeOrmRemoverMembroTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-remover-membro-transacional.repository.js';
import { TypeOrmRenovarCodigoConviteTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-renovar-codigo-convite-transacional.repository.js';
import { TypeOrmSairCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-sair-circulo-transacional.repository.js';
import { BloqueioCirculoOrmEntity } from '../../src/modules/circulos/infrastructure/persistence/typeorm/entities/bloqueio-circulo.orm-entity.js';
import { CirculoOrmEntity } from '../../src/modules/circulos/infrastructure/persistence/typeorm/entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../../src/modules/circulos/infrastructure/persistence/typeorm/entities/membro-circulo.orm-entity.js';
import {
  criarFixtureCirculos,
  type FixtureCirculos,
} from './circulos-fixture.js';

describe('Círculos no MariaDB — concorrência', () => {
  let fixture: FixtureCirculos;

  beforeAll(async () => {
    fixture = await criarFixtureCirculos();
  }, 30_000);
  afterAll(async () => {
    await fixture?.fechar();
  });

  it('duas entradas concorrentes do mesmo usuário gravam apenas um vínculo', async () => {
    const { db } = fixture;
    const admin = await fixture.criarUsuario();
    const usuario = await fixture.criarUsuario();
    const { id, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );
    const repositorio = new TypeOrmEntrarCirculoTransacionalRepository(db);
    const resultados = await Promise.all([
      repositorio.entrar(codigoConvite, usuario.id),
      repositorio.entrar(codigoConvite, usuario.id),
    ]);
    expect(resultados.map(({ status }) => status).sort()).toEqual([
      'MEMBRO_ADICIONADO',
      'USUARIO_JA_PARTICIPA',
    ]);
    expect(
      await db
        .getRepository(MembroCirculoOrmEntity)
        .findBy({ circuloId: id, usuarioId: usuario.id }),
    ).toEqual([expect.objectContaining({ funcao: 'MEMBRO' })]);
  });

  it('rebaixamentos simultâneos preservam um administrador', async () => {
    const { db } = fixture;
    const primeiro = await fixture.criarUsuario();
    const segundo = await fixture.criarUsuario();
    const { id, codigoConvite } = await fixture.criarCirculo(
      primeiro.authorization,
    );
    const entrar = new TypeOrmEntrarCirculoTransacionalRepository(db);
    const funcoes = new TypeOrmAlterarFuncaoMembroTransacionalRepository(db);
    expect((await entrar.entrar(codigoConvite, segundo.id)).status).toBe(
      'MEMBRO_ADICIONADO',
    );
    expect(
      await funcoes.alterarFuncao(id, primeiro.id, segundo.id, 'ADMINISTRADOR'),
    ).toBe('FUNCAO_ALTERADA');

    const resultados = await Promise.all([
      funcoes.alterarFuncao(id, primeiro.id, primeiro.id, 'MEMBRO'),
      funcoes.alterarFuncao(id, segundo.id, segundo.id, 'MEMBRO'),
    ]);
    expect(resultados.sort()).toEqual([
      'FUNCAO_ALTERADA',
      'ULTIMO_ADMINISTRADOR',
    ]);
    const membros = await db
      .getRepository(MembroCirculoOrmEntity)
      .findBy({ circuloId: id });
    expect(membros.map(({ funcao }) => funcao).sort()).toEqual([
      'ADMINISTRADOR',
      'MEMBRO',
    ]);
  });

  it('entrada simultânea à remoção administrativa deixa o alvo bloqueado e sem vínculo', async () => {
    const { db } = fixture;
    const admin = await fixture.criarUsuario();
    const usuario = await fixture.criarUsuario();
    const { id, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );
    const entrar = new TypeOrmEntrarCirculoTransacionalRepository(db);
    const remover = new TypeOrmRemoverMembroTransacionalRepository(db);
    expect((await entrar.entrar(codigoConvite, usuario.id)).status).toBe(
      'MEMBRO_ADICIONADO',
    );

    const [remocao, entrada] = await Promise.all([
      remover.remover(id, admin.id, usuario.id),
      entrar.entrar(codigoConvite, usuario.id),
    ]);
    expect(remocao).toBe('MEMBRO_REMOVIDO');
    expect(['USUARIO_BLOQUEADO', 'USUARIO_JA_PARTICIPA']).toContain(
      entrada.status,
    );
    const filtro = { circuloId: id, usuarioId: usuario.id };
    expect(await db.getRepository(MembroCirculoOrmEntity).countBy(filtro)).toBe(
      0,
    );
    expect(
      await db.getRepository(BloqueioCirculoOrmEntity).findBy(filtro),
    ).toEqual([expect.objectContaining({ bloqueadoPorId: admin.id })]);
  });

  it('a renovação aguarda o bloqueio pessimista e reavalia o círculo após a saída do último membro', async () => {
    const { db } = fixture;
    const admin = await fixture.criarUsuario();
    const { id, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );
    const renovacao = new TypeOrmRenovarCodigoConviteTransacionalRepository(db);
    const novoCodigo = randomBytes(5).toString('hex').toUpperCase();
    const titular = db.createQueryRunner();
    await titular.connect();

    try {
      await titular.startTransaction();
      await titular.query(
        'SELECT id_circulo FROM circulo WHERE id_circulo = ? FOR UPDATE',
        [id],
      );

      const operacao = Promise.allSettled([
        renovacao.renovar(id, admin.id, novoCodigo),
      ]);
      try {
        // O MariaDB mostra a consulta concorrente enquanto a linha está retida.
        // A conta de testes enxerga as próprias sessões sem permissão global PROCESS.
        await expect
          .poll(
            async () => {
              const resultado = await titular.query(
                `SELECT COUNT(*) AS total FROM information_schema.PROCESSLIST
             WHERE ID <> CONNECTION_ID() AND INFO LIKE 'SELECT%circulo%FOR UPDATE%'`,
                [],
                true,
              );
              const [linha] = resultado.records as Array<{
                total: number | string;
              }>;
              return Number(linha.total);
            },
            { timeout: 3_000, interval: 25 },
          )
          .toBe(1);

        await titular.manager.delete(MembroCirculoOrmEntity, {
          circuloId: id,
          usuarioId: admin.id,
        });
        await titular.manager.softDelete(CirculoOrmEntity, id);
        await titular.commitTransaction();
        expect(await operacao).toEqual([
          { status: 'fulfilled', value: { status: 'CIRCULO_NAO_ENCONTRADO' } },
        ]);
      } finally {
        if (titular.isTransactionActive) {
          await titular.rollbackTransaction();
        }
        await operacao;
      }
    } finally {
      await titular.release();
    }

    expect(
      await db.getRepository(CirculoOrmEntity).findOne({
        where: { id },
        withDeleted: true,
      }),
    ).toMatchObject({ codigoConvite, deletedAt: expect.any(Date) });
  });

  it('duas saídas concorrentes desativam o círculo sem deixar membros', async () => {
    const { db } = fixture;
    const admin = await fixture.criarUsuario();
    const usuario = await fixture.criarUsuario();
    const { id, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );
    const entrar = new TypeOrmEntrarCirculoTransacionalRepository(db);
    const sair = new TypeOrmSairCirculoTransacionalRepository(db);
    expect((await entrar.entrar(codigoConvite, usuario.id)).status).toBe(
      'MEMBRO_ADICIONADO',
    );

    const resultados = await Promise.all([
      sair.sair(id, admin.id),
      sair.sair(id, usuario.id),
    ]);
    expect(
      resultados.filter((resultado) => resultado === 'CIRCULO_DESATIVADO'),
    ).toHaveLength(1);
    expect(
      resultados.every((resultado) =>
        [
          'CIRCULO_DESATIVADO',
          'MEMBRO_REMOVIDO',
          'ADMINISTRADOR_TRANSFERIDO',
        ].includes(resultado),
      ),
    ).toBe(true);
    expect(
      await db.getRepository(MembroCirculoOrmEntity).countBy({ circuloId: id }),
    ).toBe(0);
    expect(
      await db.getRepository(CirculoOrmEntity).findOne({
        where: { id },
        withDeleted: true,
      }),
    ).toMatchObject({ deletedAt: expect.any(Date) });
  });
});
