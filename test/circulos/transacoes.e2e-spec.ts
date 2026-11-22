import { randomBytes, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import request from 'supertest';

import { criarAppE2E } from '../helpers/app-e2e.js';
import { TypeOrmCriarCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-criar-circulo-transacional.repository.js';

describe('Círculos — integração e transações', () => {
  let app: Awaited<ReturnType<typeof criarAppE2E>>;
  let db: DataSource;

  beforeAll(async () => {
    app = await criarAppE2E();
    db = app.get(DataSource);

    if (db.options.database !== 'aurora_test') {
      await app.close();
      throw new Error('Banco de testes inválido.');
    }
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('não cria círculo quando o administrador não existe', async () => {
    const repository = new TypeOrmCriarCirculoTransacionalRepository(db);

    const codigoConvite = randomBytes(5)
      .toString('hex')
      .toUpperCase();

    const criadorId = '9223372036854775807';

    const resultado = await repository.criarComAdministrador({
      nome: 'Teste de rollback',
      codigoConvite,
      criadorId,
    });

    expect(resultado.status).toBe('CRIADOR_INATIVO');

    // Confirma que nenhum círculo foi persistido.
    const circulos = await db.query<Array<{ id_circulo: string }>>(
      'SELECT id_circulo FROM circulo WHERE codigo_convite = ?',
      [codigoConvite],
    );

    expect(circulos).toHaveLength(0);

    // Confirma que nenhuma participação foi registrada.
    const membros = await db.query<
      Array<{ total: string | number }>
    >(
      `SELECT COUNT(*) AS total
       FROM membro_do_circulo
       WHERE fk_usuario_id_usuario = ?`,
      [criadorId],
    );

    expect(membros).toHaveLength(1);
    expect(Number(membros[0].total)).toBe(0);
  });

  it('salva o círculo e o administrador na mesma transação', async () => {
    const api = request(app.getHttpServer());

    const email = `integracao-${randomUUID()}@example.com`;
    const codigoConvite = randomBytes(5)
      .toString('hex')
      .toUpperCase();

    let usuarioId: string | undefined;
    let circuloId: string | undefined;

    try {
      const cadastro = await api
        .post('/auth/register')
        .send({
          nome: 'Teste de integração',
          email,
          senha: 'SenhaSegura123!',
        })
        .expect(201);

      usuarioId = String(cadastro.body.usuarioId);

      const repository =
        new TypeOrmCriarCirculoTransacionalRepository(db);

      const resultado = await repository.criarComAdministrador({
        nome: 'Círculo de integração',
        codigoConvite,
        criadorId: usuarioId,
      });

      expect(resultado.status).toBe('CIRCULO_CRIADO');

      if (resultado.status !== 'CIRCULO_CRIADO') {
        throw new Error('O círculo não foi criado.');
      }

      circuloId = resultado.circulo.id;

      // Confirma que o círculo foi persistido.
      const circulos = await db.query<
        Array<{ id_circulo: string }>
      >(
        'SELECT id_circulo FROM circulo WHERE id_circulo = ?',
        [circuloId],
      );

      expect(circulos).toHaveLength(1);

      // Confirma que o criador foi registrado como administrador.
      const membros = await db.query<
        Array<{ funcao: string }>
      >(
        `SELECT funcao
         FROM membro_do_circulo
         WHERE fk_circulo_id_circulo = ?
           AND fk_usuario_id_usuario = ?`,
        [circuloId, usuarioId],
      );

      expect(membros).toHaveLength(1);
      expect(membros[0].funcao).toBe('ADMINISTRADOR');
    } finally {
      // Remove apenas os registros criados por este teste.
      if (circuloId) {
        await db.query(
          `DELETE FROM membro_do_circulo
           WHERE fk_circulo_id_circulo = ?`,
          [circuloId],
        );

        await db.query(
          'DELETE FROM circulo WHERE id_circulo = ?',
          [circuloId],
        );
      }

      if (usuarioId) {
        await db.query(
          'DELETE FROM usuario WHERE id_usuario = ?',
          [usuarioId],
        );
      }
    }
  });
});
