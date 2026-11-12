import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {criarFixtureCirculos, type FixtureCirculos,
} from './circulos-fixture.js';

import { TypeOrmEntrarCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-entrar-circulo-transacional.repository.js';
import { randomBytes } from 'node:crypto';

import { TypeOrmRenovarCodigoConviteTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-renovar-codigo-convite-transacional.repository.js';
import { TypeOrmRemoverMembroTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-remover-membro-transacional.repository.js';
describe('Círculos — concorrência no MariaDB', () => {
  let fixture: FixtureCirculos;

  beforeAll(async () => {
    fixture = await criarFixtureCirculos();
  }, 30_000);

  afterAll(async () => {
    await fixture?.fechar();
  });

  it('impede participações duplicadas em entradas simultâneas', async () => {
    const administrador = await fixture.criarUsuario();
    const participante = await fixture.criarUsuario();

    const circulo = await fixture.criarCirculo(
      administrador.authorization,
    );

    const repository = new TypeOrmEntrarCirculoTransacionalRepository(
      fixture.db,
    );

    // Dispara duas tentativas de entrada sem aguardar
    // a conclusão da primeira.
    const resultados = await Promise.all([
      repository.entrar(circulo.codigoConvite, participante.id),
      repository.entrar(circulo.codigoConvite, participante.id),
    ]);

    const status = resultados.map((resultado) => resultado.status);

    // Uma tentativa deve entrar; a outra deve identificar
    // que o usuário já participa do círculo.
    expect(status.sort()).toEqual([
      'MEMBRO_ADICIONADO',
      'USUARIO_JA_PARTICIPA',
    ].sort());

    // Confirma diretamente no banco que não houve duplicação.
    const membros = await fixture.db.query<Array<{ total: string }>>(
      `SELECT COUNT(*) AS total
       FROM membro_do_circulo
       WHERE fk_circulo_id_circulo = ?
         AND fk_usuario_id_usuario = ?`,
      [circulo.id, participante.id],
    );

    expect(Number(membros[0].total)).toBe(1);
  });



it('permite a entrada simultânea de usuários diferentes', async () => {
  const administrador = await fixture.criarUsuario();

  const circulo = await fixture.criarCirculo(
    administrador.authorization,
  );

  // Cria cinco usuários diferentes.
  const participantes = await Promise.all(
    Array.from({ length: 5 }, () => fixture.criarUsuario()),
  );

  const repository = new TypeOrmEntrarCirculoTransacionalRepository(
    fixture.db,
  );

  // Inicia as cinco entradas simultaneamente.
  const resultados = await Promise.all(
    participantes.map((participante) =>
      repository.entrar(circulo.codigoConvite, participante.id),
    ),
  );

  // Todas as operações devem concluir com sucesso.
  expect(
    resultados.every(
      (resultado) => resultado.status === 'MEMBRO_ADICIONADO',
    ),
  ).toBe(true);

  // Confirma que os cinco participantes foram persistidos,
  // além do administrador que criou o círculo.
  const registros = await fixture.db.query<
    Array<{ usuarioId: string; total: string }>
  >(
    `SELECT
       fk_usuario_id_usuario AS usuarioId,
       COUNT(*) AS total
     FROM membro_do_circulo
     WHERE fk_circulo_id_circulo = ?
     GROUP BY fk_usuario_id_usuario`,
    [circulo.id],
  );

  expect(registros).toHaveLength(6);
  expect(registros.every((registro) => Number(registro.total) === 1)).toBe(
    true,
  );
});







it('mantém o código de convite consistente em renovações simultâneas', async () => {
  const administrador = await fixture.criarUsuario();

  const circulo = await fixture.criarCirculo(
    administrador.authorization,
  );

  const repository =
    new TypeOrmRenovarCodigoConviteTransacionalRepository(
      fixture.db,
    );

  // Gera dois códigos novos e diferentes.
  const codigoA = randomBytes(5).toString('hex').toUpperCase();
  let codigoB = randomBytes(5).toString('hex').toUpperCase();

  while (codigoB === codigoA || codigoB === circulo.codigoConvite) {
    codigoB = randomBytes(5).toString('hex').toUpperCase();
  }

  // Executa duas renovações concorrentes.
  const resultados = await Promise.all([
    repository.renovar(circulo.id, administrador.id, codigoA),
    repository.renovar(circulo.id, administrador.id, codigoB),
  ]);

  expect(resultados.map((r) => r.status)).toEqual([
    'CODIGO_RENOVADO',
    'CODIGO_RENOVADO',
  ]);

  // Consulta o estado definitivo do círculo no banco.
  const registros = await fixture.db.query<
    Array<{ codigo_convite: string }>
  >(
    'SELECT codigo_convite FROM circulo WHERE id_circulo = ?',
    [circulo.id],
  );

  expect(registros).toHaveLength(1);

  const codigoFinal = registros[0].codigo_convite;

  // Somente um dos dois códigos pode ser o código atual.
  expect([codigoA, codigoB]).toContain(codigoFinal);

  // O código original deve continuar invalidado.
  expect(codigoFinal).not.toBe(circulo.codigoConvite);
});









it('mantém a consistência em remoções administrativas simultâneas', async () => {
  const administrador = await fixture.criarUsuario();
  const participante = await fixture.criarUsuario();

  const circulo = await fixture.criarCirculo(
    administrador.authorization,
  );

  // Primeiro, adicionamos o participante ao círculo.
  const entrada = new TypeOrmEntrarCirculoTransacionalRepository(
    fixture.db,
  );

  expect(
    (await entrada.entrar(circulo.codigoConvite, participante.id))
      .status,
  ).toBe('MEMBRO_ADICIONADO');

  const repository =
    new TypeOrmRemoverMembroTransacionalRepository(fixture.db);

  // Duas operações tentam remover o mesmo usuário.
  const resultados = await Promise.all([
    repository.remover(
      circulo.id,
      administrador.id,
      participante.id,
    ),
    repository.remover(
      circulo.id,
      administrador.id,
      participante.id,
    ),
  ]);

  expect(resultados.sort()).toEqual(
    ['MEMBRO_REMOVIDO', 'MEMBRO_NAO_ENCONTRADO'].sort(),
  );

  // Nenhuma participação deve permanecer.
  const membros = await fixture.db.query<
    Array<{ total: string }>
  >(
    `SELECT COUNT(*) AS total
     FROM membro_do_circulo
     WHERE fk_circulo_id_circulo = ?
       AND fk_usuario_id_usuario = ?`,
    [circulo.id, participante.id],
  );

  expect(Number(membros[0].total)).toBe(0);

  // O bloqueio administrativo deve existir uma única vez.
  const bloqueios = await fixture.db.query<
    Array<{ total: string }>
  >(
    `SELECT COUNT(*) AS total
     FROM bloqueio_circulo
     WHERE fk_circulo_id_circulo = ?
       AND fk_usuario_id_usuario = ?`,
    [circulo.id, participante.id],
  );

  expect(Number(bloqueios[0].total)).toBe(1);
});


});
