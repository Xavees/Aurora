
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  criarFixtureCirculos,
  type FixtureCirculos,
} from './circulos-fixture.js';
import { TypeOrmAlterarFuncaoMembroTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-alterar-funcao-membro-transacional.repository.js';

import { TypeOrmDesativarUsuarioTransacionalRepository } from '../../src/modules/usuarios/infrastructure/persistence/typeorm/repositories/typeorm-desativar-usuario-transacional.repository.js';

import { TypeOrmEntrarCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-entrar-circulo-transacional.repository.js';

import { TypeOrmSairCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-sair-circulo-transacional.repository.js';

describe('Desativação de usuários — concorrência no MariaDB', () => {
  let fixture: FixtureCirculos;

  beforeAll(async () => {
    fixture = await criarFixtureCirculos();
  }, 30_000);

  afterAll(async () => {
    await fixture?.fechar();
  });

  it('mantém o círculo consistente em duas desativações simultâneas', async () => {
    const administrador = await fixture.criarUsuario();
    const participante = await fixture.criarUsuario();

    const circulo = await fixture.criarCirculo(
      administrador.authorization,
    );

    const entrada = new TypeOrmEntrarCirculoTransacionalRepository(
      fixture.db,
    );

    expect(
      (await entrada.entrar(circulo.codigoConvite, participante.id))
        .status,
    ).toBe('MEMBRO_ADICIONADO');

    const desativacao =
      new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

    // Executa as duas desativações simultaneamente.
    const resultados = await Promise.allSettled([
      desativacao.desativar(administrador.id),
      desativacao.desativar(participante.id),
    ]);

    expect(resultados).toEqual([
      { status: 'fulfilled', value: true },
      { status: 'fulfilled', value: true },
    ]);

    const usuarios = await fixture.db.query<
      Array<{ id: string; excluidoEm: Date | null }>
    >(
      `SELECT
         id_usuario AS id,
         excluido_em AS excluidoEm
       FROM usuario
       WHERE id_usuario IN (?, ?)`,
      [administrador.id, participante.id],
    );

    expect(usuarios).toHaveLength(2);
    expect(
      usuarios.every((usuario) => usuario.excluidoEm !== null),
    ).toBe(true);

    const circulos = await fixture.db.query<
      Array<{ deletedAt: Date | null }>
    >(
      `SELECT deleted_at AS deletedAt
       FROM circulo
       WHERE id_circulo = ?`,
      [circulo.id],
    );

    expect(circulos).toHaveLength(1);
    expect(circulos[0].deletedAt).not.toBeNull();

    const membros = await fixture.db.query<
      Array<{ total: string }>
    >(
      `SELECT COUNT(*) AS total
       FROM membro_do_circulo
       WHERE fk_circulo_id_circulo = ?`,
      [circulo.id],
    );

    expect(Number(membros[0].total)).toBe(0);
  }, 30_000);

  it('não mantém participações após entrada e desativação simultâneas', async () => {
    const administrador = await fixture.criarUsuario();
    const participante = await fixture.criarUsuario();

    const circulo = await fixture.criarCirculo(
      administrador.authorization,
    );

    const entrada = new TypeOrmEntrarCirculoTransacionalRepository(
      fixture.db,
    );

    const desativacao =
      new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

    // Disputa a criação de uma participação com a desativação.
    const [resultadoEntrada, resultadoDesativacao] =
      await Promise.all([
        entrada.entrar(circulo.codigoConvite, participante.id),
        desativacao.desativar(participante.id),
      ]);

    expect(resultadoDesativacao).toBe(true);

    expect([
      'MEMBRO_ADICIONADO',
      'USUARIO_INATIVO',
    ]).toContain(resultadoEntrada.status);

    const usuarios = await fixture.db.query<
      Array<{ excluidoEm: Date | null }>
    >(
      `SELECT excluido_em AS excluidoEm
       FROM usuario
       WHERE id_usuario = ?`,
      [participante.id],
    );

    expect(usuarios[0].excluidoEm).not.toBeNull();

    const membros = await fixture.db.query<
      Array<{ total: string }>
    >(
      `SELECT COUNT(*) AS total
       FROM membro_do_circulo
       WHERE fk_usuario_id_usuario = ?`,
      [participante.id],
    );

    expect(Number(membros[0].total)).toBe(0);
  }, 30_000);

  it('preserva a sucessão durante saída e desativação simultâneas', async () => {
    const administrador = await fixture.criarUsuario();
    const participante = await fixture.criarUsuario();

    const circulo = await fixture.criarCirculo(
      administrador.authorization,
    );

    const entrada = new TypeOrmEntrarCirculoTransacionalRepository(
      fixture.db,
    );

    expect(
      (await entrada.entrar(circulo.codigoConvite, participante.id))
        .status,
    ).toBe('MEMBRO_ADICIONADO');

    const saida = new TypeOrmSairCirculoTransacionalRepository(
      fixture.db,
    );

    const desativacao =
      new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

    // Disputa a saída voluntária com a desativação da conta.
    const [resultadoSaida, resultadoDesativacao] =
      await Promise.all([
        saida.sair(circulo.id, administrador.id),
        desativacao.desativar(administrador.id),
      ]);

    expect(resultadoDesativacao).toBe(true);

    expect([
      'ADMINISTRADOR_TRANSFERIDO',
      'USUARIO_NAO_PARTICIPA',
    ]).toContain(resultadoSaida);

    const membros = await fixture.db.query<
      Array<{ usuarioId: string; funcao: string }>
    >(
      `SELECT
         fk_usuario_id_usuario AS usuarioId,
         funcao
       FROM membro_do_circulo
       WHERE fk_circulo_id_circulo = ?`,
      [circulo.id],
    );

    expect(membros).toHaveLength(1);
    expect(String(membros[0].usuarioId)).toBe(participante.id);
    expect(membros[0].funcao).toBe('ADMINISTRADOR');

    const circulos = await fixture.db.query<
      Array<{ deletedAt: Date | null }>
    >(
      `SELECT deleted_at AS deletedAt
       FROM circulo
       WHERE id_circulo = ?`,
      [circulo.id],
    );

    expect(circulos).toHaveLength(1);
    expect(circulos[0].deletedAt).toBeNull();

    const usuarios = await fixture.db.query<
      Array<{ excluidoEm: Date | null }>
    >(
      `SELECT excluido_em AS excluidoEm
       FROM usuario
       WHERE id_usuario = ?`,
      [administrador.id],
    );

    expect(usuarios[0].excluidoEm).not.toBeNull();
  }, 30_000);


it('não promove uma conta desativada durante operações simultâneas', async () => {
  const administrador = await fixture.criarUsuario();
  const participante = await fixture.criarUsuario();

  const circulo = await fixture.criarCirculo(
    administrador.authorization,
  );

  const entrada = new TypeOrmEntrarCirculoTransacionalRepository(
    fixture.db,
  );

  expect(
    (await entrada.entrar(circulo.codigoConvite, participante.id))
      .status,
  ).toBe('MEMBRO_ADICIONADO');

  const alterarFuncao =
    new TypeOrmAlterarFuncaoMembroTransacionalRepository(fixture.db);

  const desativacao =
    new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

  // Disputa a promoção administrativa com a desativação da conta.
  const [resultadoPromocao, resultadoDesativacao] = await Promise.all([
    alterarFuncao.alterarFuncao(
      circulo.id,
      administrador.id,
      participante.id,
      'ADMINISTRADOR',
    ),
    desativacao.desativar(participante.id),
  ]);

  expect(resultadoDesativacao).toBe(true);

  expect([
    'FUNCAO_ALTERADA',
    'MEMBRO_NAO_ENCONTRADO',
  ]).toContain(resultadoPromocao);

  const usuarios = await fixture.db.query<
    Array<{ excluidoEm: Date | null }>
  >(
    `SELECT excluido_em AS excluidoEm
     FROM usuario
     WHERE id_usuario = ?`,
    [participante.id],
  );

  expect(usuarios).toHaveLength(1);
  expect(usuarios[0].excluidoEm).not.toBeNull();

  const membros = await fixture.db.query<
    Array<{ usuarioId: string; funcao: string }>
  >(
    `SELECT
       fk_usuario_id_usuario AS usuarioId,
       funcao
     FROM membro_do_circulo
     WHERE fk_circulo_id_circulo = ?`,
    [circulo.id],
  );

  // O participante desativado não pode permanecer administrador.
  expect(membros).toHaveLength(1);
  expect(String(membros[0].usuarioId)).toBe(administrador.id);
  expect(membros[0].funcao).toBe('ADMINISTRADOR');
}, 30_000);

it('preserva o administrador ativo durante rebaixamento e desativação simultâneos', async () => {
  const administrador = await fixture.criarUsuario();
  const segundoAdministrador = await fixture.criarUsuario();

  const circulo = await fixture.criarCirculo(
    administrador.authorization,
  );

  const entrada = new TypeOrmEntrarCirculoTransacionalRepository(
    fixture.db,
  );

  expect(
    (
      await entrada.entrar(
        circulo.codigoConvite,
        segundoAdministrador.id,
      )
    ).status,
  ).toBe('MEMBRO_ADICIONADO');

  const alterarFuncao =
    new TypeOrmAlterarFuncaoMembroTransacionalRepository(fixture.db);

  // Prepara um círculo com dois administradores ativos.
  expect(
    await alterarFuncao.alterarFuncao(
      circulo.id,
      administrador.id,
      segundoAdministrador.id,
      'ADMINISTRADOR',
    ),
  ).toBe('FUNCAO_ALTERADA');

  const desativacao =
    new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

  // Disputa o rebaixamento com a desativação do administrador.
  const [resultadoRebaixamento, resultadoDesativacao] =
    await Promise.all([
      alterarFuncao.alterarFuncao(
        circulo.id,
        administrador.id,
        segundoAdministrador.id,
        'MEMBRO',
      ),
      desativacao.desativar(segundoAdministrador.id),
    ]);

  expect(resultadoDesativacao).toBe(true);

  expect([
    'FUNCAO_ALTERADA',
    'MEMBRO_NAO_ENCONTRADO',
  ]).toContain(resultadoRebaixamento);

  const membros = await fixture.db.query<
    Array<{ usuarioId: string; funcao: string }>
  >(
    `SELECT
       fk_usuario_id_usuario AS usuarioId,
       funcao
     FROM membro_do_circulo
     WHERE fk_circulo_id_circulo = ?`,
    [circulo.id],
  );

  // Apenas o administrador que continua ativo deve permanecer.
  expect(membros).toHaveLength(1);
  expect(String(membros[0].usuarioId)).toBe(administrador.id);
  expect(membros[0].funcao).toBe('ADMINISTRADOR');

  const circulos = await fixture.db.query<
    Array<{ deletedAt: Date | null }>
  >(
    `SELECT deleted_at AS deletedAt
     FROM circulo
     WHERE id_circulo = ?`,
    [circulo.id],
  );

  expect(circulos).toHaveLength(1);
  expect(circulos[0].deletedAt).toBeNull();
}, 30_000);




it('preserva novo participante quando ele entra durante a desativação do administrador', async () => {
  const administrador = await fixture.criarUsuario();
  const participante = await fixture.criarUsuario();

  const circulo = await fixture.criarCirculo(
    administrador.authorization,
  );

  const entrada = new TypeOrmEntrarCirculoTransacionalRepository(
    fixture.db,
  );

  const desativacao =
    new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

  const bloqueio = fixture.db.createQueryRunner();

  await bloqueio.connect();

  let desativacaoPendente: Promise<boolean> | undefined;

  try {
    await bloqueio.startTransaction('READ COMMITTED');

    // Impede a desativação de adquirir o bloqueio do administrador.
    await bloqueio.manager.query(
      `SELECT id_usuario
       FROM usuario
       WHERE id_usuario = ?
       FOR UPDATE`,
      [administrador.id],
    );

    // Inicia a desativação enquanto a conta permanece bloqueada.
    desativacaoPendente = desativacao.desativar(administrador.id);

    // O participante consegue entrar antes da desativação avançar.
    const resultadoEntrada = await entrada.entrar(
      circulo.codigoConvite,
      participante.id,
    );

    expect(resultadoEntrada.status).toBe('MEMBRO_ADICIONADO');
  } finally {
    if (bloqueio.isTransactionActive) {
      await bloqueio.rollbackTransaction();
    }

    await bloqueio.release();
  }

  expect(desativacaoPendente).toBeDefined();
  expect(await desativacaoPendente).toBe(true);

  const usuarios = await fixture.db.query<
    Array<{ excluidoEm: Date | null }>
  >(
    `SELECT excluido_em AS excluidoEm
     FROM usuario
     WHERE id_usuario = ?`,
    [administrador.id],
  );

  expect(usuarios).toHaveLength(1);
  expect(usuarios[0].excluidoEm).not.toBeNull();

  const membros = await fixture.db.query<
    Array<{ usuarioId: string; funcao: string }>
  >(
    `SELECT
       fk_usuario_id_usuario AS usuarioId,
       funcao
     FROM membro_do_circulo
     WHERE fk_circulo_id_circulo = ?`,
    [circulo.id],
  );

  // O novo participante deve assumir a administração.
  expect(membros).toHaveLength(1);
  expect(String(membros[0].usuarioId)).toBe(participante.id);
  expect(membros[0].funcao).toBe('ADMINISTRADOR');

  const circulos = await fixture.db.query<
    Array<{ deletedAt: Date | null }>
  >(
    `SELECT deleted_at AS deletedAt
     FROM circulo
     WHERE id_circulo = ?`,
    [circulo.id],
  );

  expect(circulos).toHaveLength(1);
  expect(circulos[0].deletedAt).toBeNull();
}, 30_000);







});
