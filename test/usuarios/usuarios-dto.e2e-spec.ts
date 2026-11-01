import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAppE2E } from '../helpers/app-e2e.js';
import { randomUUID } from 'crypto';

describe('Validação dos usuários (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  beforeAll(async () => {
    app = await criarAppE2E();
    dataSource = app.get(DataSource);
  }, 30_000);
  it('PATCH /usuarios/:id deve rejeitar nome com menos de 2 caracteres', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // 1. Cadastra um usuário.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Validacao E2E',
          email,
          senha,
        })
        .expect(201);

      const usuarioId = cadastro.body.usuarioId;

      // 2. Autentica o usuário.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      // 3. Tenta atualizar o nome com apenas um caractere.
      await request(app.getHttpServer())
        .patch(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${login.body.access_token}`)
        .send({
          nome: 'A',
        })
        .expect(400);

      // 4. Confirma que o nome original permaneceu no banco.
      const registros: Array<{ nome: string }> = await dataSource.query(
        'SELECT nome FROM usuario WHERE id_usuario = ?',
        [usuarioId],
      );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.nome).toBe('Usuario Validacao E2E');
    } finally {
      // 5. Limpeza restrita ao banco E2E.
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

  it('PATCH /usuarios/:id deve rejeitar telefone inválido', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // 1. Cadastra um usuário no banco de testes.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Telefone E2E',
          email,
          senha,
        })
        .expect(201);

      const usuarioId = cadastro.body.usuarioId;

      // 2. Autentica e obtém o JWT.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      // 3. Envia um telefone inválido.
      const resposta = await request(app.getHttpServer())
        .patch(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${login.body.access_token}`)
        .send({
          telefone: '12345',
        })
        .expect(400);

      // 4. Confirma que a API rejeitou a requisição.
      expect(resposta.body.statusCode).toBe(400);

      // 5. Verifica que o telefone não foi alterado no banco.
      const registros: Array<{ telefone: string | null }> =
        await dataSource.query(
          'SELECT telefone FROM usuario WHERE id_usuario = ?',
          [usuarioId],
        );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.telefone).toBeNull();
    } finally {
      // 6. Limpeza exclusiva do banco E2E.
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

  it('PATCH /usuarios/:id deve rejeitar fotoUrl sem HTTPS', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // 1. Cadastra o usuário.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Foto E2E',
          email,
          senha,
        })
        .expect(201);

      const usuarioId = cadastro.body.usuarioId;

      // 2. Obtém o JWT.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      // 3. Tenta cadastrar uma URL HTTP.
      const resposta = await request(app.getHttpServer())
        .patch(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${login.body.access_token}`)
        .send({
          fotoUrl: 'http://example.com/foto.jpg',
        })
        .expect(400);

      expect(resposta.body.statusCode).toBe(400);

      // 4. Confirma que a foto não foi alterada no banco.
      const registros: Array<{ foto_url: string | null }> =
        await dataSource.query(
          'SELECT foto_url FROM usuario WHERE id_usuario = ?',
          [usuarioId],
        );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.foto_url).toBeNull();
    } finally {
      // Limpeza restrita ao banco E2E.
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

  it('PATCH /usuarios/:id deve rejeitar campos não permitidos', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // Cadastra um usuário comum.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Seguranca E2E',
          email,
          senha,
        })
        .expect(201);

      const usuarioId = cadastro.body.usuarioId;

      // Obtém o JWT.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      // Tenta alterar um campo que não existe no DTO.
      const resposta = await request(app.getHttpServer())
        .patch(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${login.body.access_token}`)
        .send({
          tipoUsuario: 'PREMIUM',
        })
        .expect(400);

      expect(resposta.body.statusCode).toBe(400);

      // Confirma que o tipo de usuário não mudou.
      const registros: Array<{ tipo_usuario: string }> = await dataSource.query(
        'SELECT tipo_usuario FROM usuario WHERE id_usuario = ?',
        [usuarioId],
      );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.tipo_usuario).toBe('COMUM');
    } finally {
      // Limpeza protegida do banco E2E.
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

  it('GET /usuarios/:id deve rejeitar IDs inválidos', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // 1. Cadastra um usuário.
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Parametro E2E',
          email,
          senha,
        })
        .expect(201);

      // 2. Obtém um JWT válido.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      const token = login.body.access_token;

      // 3. Verifica diferentes IDs inválidos.
      const idsInvalidos = ['abc', '-1', '1.5'];

      for (const id of idsInvalidos) {
        const resposta = await request(app.getHttpServer())
          .get(`/usuarios/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);

        expect(resposta.body.statusCode).toBe(400);
      }
    } finally {
      // 4. Limpeza exclusiva do banco E2E.
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
