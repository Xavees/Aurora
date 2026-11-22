
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  criarFixtureCirculos,
  type FixtureCirculos,
} from './circulos-fixture.js';
import { vi } from 'vitest';
import { Repository } from 'typeorm';
import { TypeOrmAlterarFuncaoMembroTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-alterar-funcao-membro-transacional.repository.js';
import { TypeOrmDesativarUsuarioTransacionalRepository } from '../../src/modules/usuarios/infrastructure/persistence/typeorm/repositories/typeorm-desativar-usuario-transacional.repository.js';

import { TypeOrmEntrarCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-entrar-circulo-transacional.repository.js';

describe('Desativação coordenada de usuários', () => {
  let fixture: FixtureCirculos;

  beforeAll(async () => {
    fixture = await criarFixtureCirculos();
  }, 30_000);

  afterAll(async () => {
    await fixture?.fechar();
  });

  it('desativa um usuário sem círculos', async () => {
    const usuario = await fixture.criarUsuario();

    const repository =
      new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

    const resultado = await repository.desativar(usuario.id);

    expect(resultado).toBe(true);

    const registros = await fixture.db.query<
      Array<{ excluido_em: Date | null }>
    >(
      'SELECT excluido_em FROM usuario WHERE id_usuario = ?',
      [usuario.id],
    );

    expect(registros[0].excluido_em).not.toBeNull();
  });

  it('transfere a administração ao membro ativo mais antigo', async () => {
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

    const repository =
      new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

    expect(await repository.desativar(administrador.id)).toBe(true);

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
  });

  it('desativa o círculo quando o último participante sai', async () => {
    const administrador = await fixture.criarUsuario();

    const circulo = await fixture.criarCirculo(
      administrador.authorization,
    );

    const repository =
      new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

    expect(await repository.desativar(administrador.id)).toBe(true);

    const registros = await fixture.db.query<
      Array<{ deleted_at: Date | null }>
    >(
      'SELECT deleted_at FROM circulo WHERE id_circulo = ?',
      [circulo.id],
    );

    expect(registros[0].deleted_at).not.toBeNull();

    const membros = await fixture.db.query<
      Array<{ total: string }>
    >(
      `SELECT COUNT(*) AS total
       FROM membro_do_circulo
       WHERE fk_circulo_id_circulo = ?`,
      [circulo.id],
    );

    expect(Number(membros[0].total)).toBe(0);
  });

  it('não desativa novamente uma conta já desativada', async () => {
    const usuario = await fixture.criarUsuario();

    const repository =
      new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

    expect(await repository.desativar(usuario.id)).toBe(true);
    expect(await repository.desativar(usuario.id)).toBe(false);
  });




it('mantém o círculo consistente quando dois participantes desativam simultaneamente', async () => {
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

  const repository =
    new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

  // Dispara as duas desativações sem aguardar a primeira.
  const resultados = await Promise.allSettled([
    repository.desativar(administrador.id),
    repository.desativar(participante.id),
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
  expect(usuarios.every((usuario) => usuario.excluidoEm !== null)).toBe(
    true,
  );

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




it('reverte a sucessão e a remoção de membros se o soft delete falhar', async () => {
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

  const repository =
    new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

  // Simula uma falha na última etapa da transação.
  const softDeleteSpy = vi
    .spyOn(Repository.prototype, 'softDelete')
    .mockRejectedValueOnce(
      new Error('Falha simulada no soft delete'),
    );

  try {
    await expect(
      repository.desativar(administrador.id),
    ).rejects.toThrow('Falha simulada no soft delete');
  } finally {
    softDeleteSpy.mockRestore();
  }

  // Confirma que a conta continua ativa.
  const usuarios = await fixture.db.query<
    Array<{ excluidoEm: Date | null }>
  >(
    'SELECT excluido_em AS excluidoEm FROM usuario WHERE id_usuario = ?',
    [administrador.id],
  );

  expect(usuarios[0].excluidoEm).toBeNull();

  // Confirma que a promoção e a remoção foram revertidas.
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

  expect(membros).toHaveLength(2);

  const administradorAtual = membros.find(
    (membro) => String(membro.usuarioId) === administrador.id,
  );

  const participanteAtual = membros.find(
    (membro) => String(membro.usuarioId) === participante.id,
  );

  expect(administradorAtual?.funcao).toBe('ADMINISTRADOR');
  expect(participanteAtual?.funcao).toBe('MEMBRO');

  const circulos = await fixture.db.query<
    Array<{ deletedAt: Date | null }>
  >(
    'SELECT deleted_at AS deletedAt FROM circulo WHERE id_circulo = ?',
    [circulo.id],
  );

  expect(circulos[0].deletedAt).toBeNull();
}, 30_000);







it('processa múltiplos círculos com regras diferentes na mesma desativação', async () => {
  const usuario = await fixture.criarUsuario();
  const sucessor = await fixture.criarUsuario();
  const outroAdministrador = await fixture.criarUsuario();

  const entrada = new TypeOrmEntrarCirculoTransacionalRepository(
    fixture.db,
  );

  const alterarFuncao =
    new TypeOrmAlterarFuncaoMembroTransacionalRepository(fixture.db);

  const circuloA = await fixture.criarCirculo(
    usuario.authorization,
    'Círculo A',
  );

  const circuloB = await fixture.criarCirculo(
    usuario.authorization,
    'Círculo B',
  );

  const circuloC = await fixture.criarCirculo(
    usuario.authorization,
    'Círculo C',
  );

  expect(
    (await entrada.entrar(circuloA.codigoConvite, sucessor.id))
      .status,
  ).toBe('MEMBRO_ADICIONADO');

  expect(
    (
      await entrada.entrar(
        circuloC.codigoConvite,
        outroAdministrador.id,
      )
    ).status,
  ).toBe('MEMBRO_ADICIONADO');

  expect(
    await alterarFuncao.alterarFuncao(
      circuloC.id,
      usuario.id,
      outroAdministrador.id,
      'ADMINISTRADOR',
    ),
  ).toBe('FUNCAO_ALTERADA');

  const desativacao =
    new TypeOrmDesativarUsuarioTransacionalRepository(fixture.db);

  expect(await desativacao.desativar(usuario.id)).toBe(true);

  const membrosA = await fixture.db.query<
    Array<{ usuarioId: string; funcao: string }>
  >(
    `SELECT
       fk_usuario_id_usuario AS usuarioId,
       funcao
     FROM membro_do_circulo
     WHERE fk_circulo_id_circulo = ?`,
    [circuloA.id],
  );

  expect(membrosA).toHaveLength(1);
  expect(String(membrosA[0].usuarioId)).toBe(sucessor.id);
  expect(membrosA[0].funcao).toBe('ADMINISTRADOR');

  const circulosB = await fixture.db.query<
    Array<{ deletedAt: Date | null }>
  >(
    'SELECT deleted_at AS deletedAt FROM circulo WHERE id_circulo = ?',
    [circuloB.id],
  );

  expect(circulosB[0].deletedAt).not.toBeNull();

  const membrosC = await fixture.db.query<
    Array<{ usuarioId: string; funcao: string }>
  >(
    `SELECT
       fk_usuario_id_usuario AS usuarioId,
       funcao
     FROM membro_do_circulo
     WHERE fk_circulo_id_circulo = ?`,
    [circuloC.id],
  );

  expect(membrosC).toHaveLength(1);
  expect(String(membrosC[0].usuarioId)).toBe(outroAdministrador.id);
  expect(membrosC[0].funcao).toBe('ADMINISTRADOR');

  const participacoes = await fixture.db.query<
    Array<{ total: string }>
  >(
    `SELECT COUNT(*) AS total
     FROM membro_do_circulo
     WHERE fk_usuario_id_usuario = ?`,
    [usuario.id],
  );

  expect(Number(participacoes[0].total)).toBe(0);

  const usuarios = await fixture.db.query<
    Array<{ excluidoEm: Date | null }>
  >(
    'SELECT excluido_em AS excluidoEm FROM usuario WHERE id_usuario = ?',
    [usuario.id],
  );

  expect(usuarios[0].excluidoEm).not.toBeNull();
}, 30_000);








}


















);
