import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAppE2E } from '../helpers/app-e2e.js';
import { randomUUID } from 'crypto';

describe('Usuários (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  beforeAll(async () => {
    app = await criarAppE2E();
    dataSource = app.get(DataSource);
  }, 30_000);
  it('GET /usuarios/:id deve rejeitar acesso sem JWT', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/usuarios/1')
      .expect(401);

    expect(resposta.body.access_token).toBeUndefined();
  });

  it('GET /usuarios/:id deve permitir acesso com JWT válido', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // Cadastra um usuário no banco de testes.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Autenticado E2E',
          email,
          senha,
        })
        .expect(201);

      const usuarioId = cadastro.body.usuarioId;

      // Autentica o usuário e obtém seu JWT.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      const token = login.body.access_token;

      // Consulta o próprio perfil utilizando o token.
      const resposta = await request(app.getHttpServer())
        .get(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Confirma que os dados pertencem ao usuário autenticado.
      expect(resposta.body).toMatchObject({
        id: usuarioId,
        nome: 'Usuario Autenticado E2E',
        email,
        tipoUsuario: 'COMUM',
      });

      // A senha nunca deve aparecer na resposta.
      expect(resposta.body.senha).toBeUndefined();
    } finally {
      // Limpeza exclusiva do banco E2E.
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

  it('GET /usuarios/:id deve impedir acesso ao perfil de outro usuário', async () => {
    const emailA = `e2e-${randomUUID()}@example.com`;
    const emailB = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // Cadastra dois usuários distintos.
      const cadastroA = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario A E2E',
          email: emailA,
          senha,
        })
        .expect(201);

      const cadastroB = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario B E2E',
          email: emailB,
          senha,
        })
        .expect(201);

      // Autentica somente o usuário A.
      const loginA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: emailA,
          senha,
        })
        .expect(200);

      // Usuário A tenta consultar o perfil do usuário B.
      const resposta = await request(app.getHttpServer())
        .get(`/usuarios/${cadastroB.body.usuarioId}`)
        .set('Authorization', `Bearer ${loginA.body.access_token}`)
        .expect(403);

      expect(resposta.body.access_token).toBeUndefined();

      // Confirma que os usuários realmente são diferentes.
      expect(cadastroA.body.usuarioId).not.toBe(cadastroB.body.usuarioId);
    } finally {
      // Garante que a limpeza aconteça somente no banco E2E.
      if (dataSource?.isInitialized) {
        const resultado: Array<{ banco: string }> = await dataSource.query(
          'SELECT DATABASE() AS banco',
        );

        if (resultado[0]?.banco !== 'aurora_test') {
          throw new Error('Limpeza E2E bloqueada: banco incorreto.');
        }

        await dataSource.query('DELETE FROM usuario WHERE email IN (?, ?)', [
          emailA,
          emailB,
        ]);
      }
    }
  });

  it('GET /usuarios/:id deve rejeitar JWT inválido', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/usuarios/1')
      .set('Authorization', 'Bearer token.invalido.adulterado')
      .expect(401);

    // Nenhum token deve ser retornado na resposta de erro.
    expect(resposta.body.access_token).toBeUndefined();
  });

  it('GET /usuarios/:id deve rejeitar JWT de usuário desativado', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // 1. Cadastra um usuário.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Desativado E2E',
          email,
          senha,
        })
        .expect(201);

      const usuarioId = cadastro.body.usuarioId;

      // 2. Obtém um JWT válido.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      const token = login.body.access_token;

      // 3. Desativa a conta.
      await request(app.getHttpServer())
        .delete(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // 4. Tenta acessar a conta usando o mesmo JWT.
      const resposta = await request(app.getHttpServer())
        .get(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(resposta.body.access_token).toBeUndefined();

      // 5. Confirma que houve soft delete no banco.
      const registros: Array<{ excluido_em: Date | null }> =
        await dataSource.query(
          'SELECT excluido_em FROM usuario WHERE id_usuario = ?',
          [usuarioId],
        );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.excluido_em).not.toBeNull();
    } finally {
      // Remove fisicamente apenas os dados deste teste.
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

  it('PATCH /usuarios/:id deve atualizar o próprio perfil', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // 1. Cadastra o usuário.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Original E2E',
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

      const token = login.body.access_token;

      // 3. Atualiza os dados do próprio perfil.
      const resposta = await request(app.getHttpServer())
        .patch(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Usuario Atualizado E2E',
          telefone: '11987654321',
        })
        .expect(200);

      // 4. Confirma a resposta da API.
      expect(resposta.body).toMatchObject({
        id: usuarioId,
        nome: 'Usuario Atualizado E2E',
        telefone: '11987654321',
        email,
      });

      // 5. Confirma a persistência no MariaDB.
      const registros: Array<{
        nome: string;
        telefone: string | null;
      }> = await dataSource.query(
        'SELECT nome, telefone FROM usuario WHERE id_usuario = ?',
        [usuarioId],
      );

      expect(registros).toHaveLength(1);
      expect(registros[0]).toMatchObject({
        nome: 'Usuario Atualizado E2E',
        telefone: '11987654321',
      });
    } finally {
      // 6. Limpa somente os dados deste teste.
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

  it('PATCH /usuarios/:id deve impedir atualização de outro usuário', async () => {
    const emailA = `e2e-${randomUUID()}@example.com`;
    const emailB = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // Cadastra dois usuários diferentes.
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario A E2E',
          email: emailA,
          senha,
        })
        .expect(201);

      const cadastroB = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario B E2E',
          email: emailB,
          senha,
        })
        .expect(201);

      // Autentica somente o usuário A.
      const loginA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailA, senha })
        .expect(200);

      // Usuário A tenta alterar o perfil do usuário B.
      await request(app.getHttpServer())
        .patch(`/usuarios/${cadastroB.body.usuarioId}`)
        .set('Authorization', `Bearer ${loginA.body.access_token}`)
        .send({
          nome: 'Nome Alterado Indevidamente',
        })
        .expect(403);

      // Confirma que o banco não foi alterado.
      const registros: Array<{ nome: string }> = await dataSource.query(
        'SELECT nome FROM usuario WHERE id_usuario = ?',
        [cadastroB.body.usuarioId],
      );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.nome).toBe('Usuario B E2E');
    } finally {
      // Limpeza restrita ao banco de testes.
      if (dataSource?.isInitialized) {
        const resultado: Array<{ banco: string }> = await dataSource.query(
          'SELECT DATABASE() AS banco',
        );

        if (resultado[0]?.banco !== 'aurora_test') {
          throw new Error('Limpeza E2E bloqueada: banco incorreto.');
        }

        await dataSource.query('DELETE FROM usuario WHERE email IN (?, ?)', [
          emailA,
          emailB,
        ]);
      }
    }
  });

  it('DELETE /usuarios/:id deve impedir desativação de outro usuário', async () => {
    const emailA = `e2e-${randomUUID()}@example.com`;
    const emailB = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // 1. Cadastra dois usuários.
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario A E2E',
          email: emailA,
          senha,
        })
        .expect(201);

      const cadastroB = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario B E2E',
          email: emailB,
          senha,
        })
        .expect(201);

      // 2. Autentica somente o usuário A.
      const loginA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailA, senha })
        .expect(200);

      // 3. Usuário A tenta desativar a conta do usuário B.
      await request(app.getHttpServer())
        .delete(`/usuarios/${cadastroB.body.usuarioId}`)
        .set('Authorization', `Bearer ${loginA.body.access_token}`)
        .expect(403);

      // 4. Confirma que a conta B continua ativa.
      const registros: Array<{ excluido_em: Date | null }> =
        await dataSource.query(
          'SELECT excluido_em FROM usuario WHERE id_usuario = ?',
          [cadastroB.body.usuarioId],
        );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.excluido_em).toBeNull();
    } finally {
      // Limpeza exclusiva do banco E2E.
      if (dataSource?.isInitialized) {
        const resultado: Array<{ banco: string }> = await dataSource.query(
          'SELECT DATABASE() AS banco',
        );

        if (resultado[0]?.banco !== 'aurora_test') {
          throw new Error('Limpeza E2E bloqueada: banco incorreto.');
        }

        await dataSource.query('DELETE FROM usuario WHERE email IN (?, ?)', [
          emailA,
          emailB,
        ]);
      }
    }
  });

  it('DELETE /usuarios/:id deve desativar a própria conta e invalidar o JWT', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // 1. Cadastra o usuário.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Soft Delete E2E',
          email,
          senha,
        })
        .expect(201);

      const usuarioId = cadastro.body.usuarioId;

      // 2. Obtém um JWT válido.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      const token = login.body.access_token;

      // 3. Desativa a própria conta.
      const resposta = await request(app.getHttpServer())
        .delete(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(resposta.text).toBe('');

      // 4. Confirma o soft delete no MariaDB.
      const registros: Array<{
        id_usuario: string;
        excluido_em: Date | null;
      }> = await dataSource.query(
        'SELECT id_usuario, excluido_em FROM usuario WHERE id_usuario = ?',
        [usuarioId],
      );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.excluido_em).not.toBeNull();

      // 5. Confirma que o JWT antigo não autoriza novas operações.
      await request(app.getHttpServer())
        .get(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    } finally {
      // Limpeza restrita ao banco de testes.
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
