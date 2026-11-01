import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAppE2E } from '../helpers/app-e2e.js';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

describe('Autenticação (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  beforeAll(async () => {
    app = await criarAppE2E();
    dataSource = app.get(DataSource);
  }, 30_000);
  it('POST /auth/register deve cadastrar um usuário', async () => {
    const email = `e2e-${crypto.randomUUID()}@example.com`;

    try {
      const resposta = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Teste E2E',
          email,
          senha: 'SenhaSegura123!',
        })
        .expect(201);

      expect(resposta.body).toMatchObject({
        email,
      });

      expect(resposta.body.usuarioId).toBeDefined();
    } finally {
      // Limpeza restrita ao usuário criado por este teste.
      if (dataSource?.isInitialized) {
        const banco: Array<{ nome: string }> = await dataSource.query(
          'SELECT DATABASE() AS nome',
        );

        if (banco[0]?.nome !== 'aurora_test') {
          throw new Error('Limpeza E2E bloqueada: banco incorreto.');
        }

        await dataSource.query('DELETE FROM usuario WHERE email = ?', [email]);
      }
    }
  });

  it('POST /auth/login deve autenticar um usuário cadastrado', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // Primeiro, cadastramos um usuário real no banco de testes.
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Login E2E',
          email,
          senha,
        })
        .expect(201);

      // Depois, tentamos autenticar esse mesmo usuário.
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      // Verifica o contrato de resposta da autenticação.
      expect(resposta.body).toMatchObject({
        token_type: 'Bearer',
        expires_in: 900,
      });

      expect(resposta.body.access_token).toEqual(expect.any(String));

      // Um JWT possui três partes separadas por pontos.
      expect(resposta.body.access_token.split('.')).toHaveLength(3);
    } finally {
      // Remove somente o usuário criado por este teste.
      if (dataSource?.isInitialized) {
        const resultado: Array<{ banco: string }> = await dataSource.query(
          'SELECT DATABASE() AS banco',
        );

        if (resultado[0]?.banco !== 'aurora_test') {
          throw new Error('Limpeza E2E bloqueada: banco incorreto.');
        }

        await dataSource.query('DELETE FROM usuario WHERE email = ?', [email]);
      }
    }
  });

  it('POST /auth/login deve rejeitar senha incorreta', async () => {
    const email = `e2e-${randomUUID()}@example.com`;

    try {
      // Cadastra um usuário no banco exclusivo de testes.
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Senha Incorreta E2E',
          email,
          senha: 'SenhaCorreta123!',
        })
        .expect(201);

      // Tenta autenticar com uma senha diferente.
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          senha: 'SenhaErrada123!',
        })
        .expect(401);

      // A API não deve fornecer um token.
      expect(resposta.body.access_token).toBeUndefined();
    } finally {
      // Garante que a limpeza só ocorra no banco de testes.
      if (dataSource?.isInitialized) {
        const resultado: Array<{ banco: string }> = await dataSource.query(
          'SELECT DATABASE() AS banco',
        );

        if (resultado[0]?.banco !== 'aurora_test') {
          throw new Error('Limpeza E2E bloqueada: banco incorreto.');
        }

        await dataSource.query('DELETE FROM usuario WHERE email = ?', [email]);
      }
    }
  });

  it('POST /auth/register deve rejeitar e-mail duplicado', async () => {
    const email = `e2e-${randomUUID()}@example.com`;

    try {
      // Primeiro cadastro: deve funcionar.
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Original E2E',
          email,
          senha: 'SenhaSegura123!',
        })
        .expect(201);

      // Segundo cadastro: mesmo e-mail, deve ser rejeitado.
      const resposta = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Duplicado E2E',
          email,
          senha: 'OutraSenha123!',
        })
        .expect(409);

      // Confirma que não houve duplicação no banco.
      const registros: Array<{ total: string | number }> =
        await dataSource.query(
          'SELECT COUNT(*) AS total FROM usuario WHERE email = ?',
          [email],
        );

      expect(Number(registros[0]?.total)).toBe(1);
      expect(resposta.body.access_token).toBeUndefined();
    } finally {
      // Exclui somente o registro criado pelo teste.
      if (dataSource?.isInitialized) {
        const resultado: Array<{ banco: string }> = await dataSource.query(
          'SELECT DATABASE() AS banco',
        );

        if (resultado[0]?.banco !== 'aurora_test') {
          throw new Error('Limpeza E2E bloqueada: banco incorreto.');
        }

        await dataSource.query('DELETE FROM usuario WHERE email = ?', [email]);
      }
    }
  });
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
