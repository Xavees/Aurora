
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { criarAppE2E } from '../helpers/app-e2e.js';
import { TypeOrmCriarCirculoTransacionalRepository } from '../../src/modules/circulos/infrastructure/persistence/typeorm/repositories/typeorm-criar-circulo-transacional.repository.js';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
describe('Círculos — integração e transações', () => {
  let app: Awaited<ReturnType<typeof criarAppE2E>>;
  let db: DataSource;

  beforeAll(async () => {
    app = await criarAppE2E();
    db = app.get(DataSource);

    // Proteção adicional: nunca testar no banco principal.
    if (db.options.database !== 'aurora_test') {
      await app.close();
      throw new Error('Banco de testes inválido.');
    }
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('desfaz a criação do círculo se o administrador não existir', async () => {
    const repository = new TypeOrmCriarCirculoTransacionalRepository(db);

    // Código exclusivo para identificar a tentativa de criação.
    const codigoConvite = randomBytes(5)
      .toString('hex')
      .toUpperCase();

    // ID inexistente que provoca uma falha de chave estrangeira.
    const criadorId = '9223372036854775807';

    await expect(
      repository.criarComAdministrador({
        nome: 'Teste de rollback',
        codigoConvite,
        criadorId,
      }),
    ).rejects.toThrow();

    // O rollback deve remover o círculo criado parcialmente.
    const circulos = await db.query<Array<{ id_circulo: string }>>(
      'SELECT id_circulo FROM circulo WHERE codigo_convite = ?',
      [codigoConvite],
    );

    expect(circulos).toHaveLength(0);
  });



it('salva o círculo e o administrador na mesma transação', async () => {
  const api = request(app.getHttpServer());
  const email = `integracao-${randomUUID()}@example.com`;
  const codigoConvite = randomBytes(5).toString('hex').toUpperCase();

  let usuarioId: string | undefined;
  let circuloId: string | undefined;

  try {
    // Cria um usuário válido para respeitar a chave estrangeira.
    const cadastro = await api.post('/auth/register').send({
      nome: 'Teste de integração',
      email,
      senha: 'SenhaSegura123!',
    }).expect(201);

    usuarioId = String(cadastro.body.usuarioId);

    const repository = new TypeOrmCriarCirculoTransacionalRepository(db);

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
    const circulos = await db.query(
      'SELECT id_circulo FROM circulo WHERE id_circulo = ?',
      [circuloId],
    );

    expect(circulos).toHaveLength(1);

    // Confirma que o criador foi salvo como administrador.
    const membros = await db.query(
      `SELECT funcao FROM membro_do_circulo
       WHERE fk_circulo_id_circulo = ?
       AND fk_usuario_id_usuario = ?`,
      [circuloId, usuarioId],
    );

    expect(membros).toHaveLength(1);
    expect(membros[0].funcao).toBe('ADMINISTRADOR');
  } finally {
    // Limpa somente os registros criados por este teste.
    if (circuloId) {
      await db.query(
        'DELETE FROM membro_do_circulo WHERE fk_circulo_id_circulo = ?',
        [circuloId],
      );
      await db.query('DELETE FROM circulo WHERE id_circulo = ?', [
        circuloId,
      ]);
    }

    if (usuarioId) {
      await db.query('DELETE FROM usuario WHERE id_usuario = ?', [
        usuarioId,
      ]);
    }
  }
});



















});
