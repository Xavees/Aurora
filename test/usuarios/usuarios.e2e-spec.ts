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



it.each([
  ['nome nulo', null],
  ['nome vazio', ''],
  ['nome apenas com espaços', '   '],
  ['nome com apenas um caractere', 'A'],
  ['nome numérico', 123],
])(
  'PATCH /usuarios/:id deve rejeitar %s com HTTP 400',
  async (_cenario, nomeInvalido) => {
    const email = `e2e-${randomUUID()}@example.com`;
    const senha = 'SenhaSegura123!';

    try {
      // Cria um usuário real no banco de testes.
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Usuario Original E2E',
          email,
          senha,
        })
        .expect(201);

      const usuarioId = cadastro.body.usuarioId;

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      // Tenta alterar o nome usando um valor inválido.
      await request(app.getHttpServer())
        .patch(`/usuarios/${usuarioId}`)
        .set('Authorization', `Bearer ${login.body.access_token}`)
        .send({ nome: nomeInvalido })
        .expect(400);

      /**
       * Garante que o erro de validação não alterou
       * os dados persistidos no MariaDB.
       */
      const registros: Array<{ nome: string }> =
        await dataSource.query(
          'SELECT nome FROM usuario WHERE id_usuario = ?',
          [usuarioId],
        );

      expect(registros).toHaveLength(1);
      expect(registros[0]?.nome).toBe('Usuario Original E2E');
    } finally {
      // Impede limpeza acidental fora do banco E2E.
      if (dataSource?.isInitialized) {
        const resultado: Array<{ banco: string }> =
          await dataSource.query('SELECT DATABASE() AS banco');

        if (resultado[0]?.banco !== 'aurora_test') {
          throw new Error('Limpeza E2E bloqueada: banco incorreto.');
        }

        await dataSource.query(
          'DELETE FROM usuario WHERE email = ?',
          [email],
        );
      }
    }
  },
);


it('PATCH /usuarios/:id retorna 409 para telefone duplicado', async () => {
  const emailA = `e2e-${randomUUID()}@example.com`;
  const emailB = `e2e-${randomUUID()}@example.com`;
  const senha = 'SenhaSegura123!';

  // Telefone válido para testar a restrição UNIQUE.
  const telefone = '11987654321';

  try {
    // 1. Cadastra dois usuários.
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

    // 2. Autentica os dois usuários.
    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailA, senha })
      .expect(200);

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailB, senha })
      .expect(200);

    // 3. O usuário A cadastra o telefone primeiro.
    await request(app.getHttpServer())
      .patch(`/usuarios/${cadastroA.body.usuarioId}`)
      .set('Authorization', `Bearer ${loginA.body.access_token}`)
      .send({ telefone })
      .expect(200);

    // 4. O usuário B tenta utilizar o mesmo telefone.
    const resposta = await request(app.getHttpServer())
      .patch(`/usuarios/${cadastroB.body.usuarioId}`)
      .set('Authorization', `Bearer ${loginB.body.access_token}`)
      .send({ telefone })
      .expect(409);

    expect(resposta.body).toMatchObject({
      statusCode: 409,
      message: 'Telefone já cadastrado.',
    });

    // 5. Verifica se o banco preservou os valores originais.
    const registros: Array<{
      email: string;
      telefone: string | null;
    }> = await dataSource.query(
      'SELECT email, telefone FROM usuario WHERE email IN (?, ?)',
      [emailA, emailB],
    );

    expect(registros).toHaveLength(2);

    const usuarioA = registros.find(
      (registro) => registro.email === emailA,
    );

    const usuarioB = registros.find(
      (registro) => registro.email === emailB,
    );

    expect(usuarioA?.telefone).toBe(telefone);
    expect(usuarioB?.telefone).toBeNull();
  } finally {
    /**
     * Nunca executamos limpeza sem confirmar
     * que estamos no banco exclusivo de testes.
     */
    if (dataSource?.isInitialized) {
      const resultado: Array<{ banco: string }> =
        await dataSource.query('SELECT DATABASE() AS banco');

      if (resultado[0]?.banco !== 'aurora_test') {
        throw new Error('Limpeza E2E bloqueada: banco incorreto.');
      }

      await dataSource.query(
        'DELETE FROM usuario WHERE email IN (?, ?)',
        [emailA, emailB],
      );
    }
  }
});





it('DELETE /usuarios/:id transfere a administração antes de desativar a conta', async () => {
  const emailAdmin = `e2e-${randomUUID()}@example.com`;
  const emailMembro = `e2e-${randomUUID()}@example.com`;
  const senha = 'SenhaSegura123!';

  let circuloId: string | undefined;

  try {
    const cadastroAdmin = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Administrador E2E',
        email: emailAdmin,
        senha,
      })
      .expect(201);

    const cadastroMembro = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Membro E2E',
        email: emailMembro,
        senha,
      })
      .expect(201);

    const adminId = String(cadastroAdmin.body.usuarioId);
    const membroId = String(cadastroMembro.body.usuarioId);

    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailAdmin, senha })
      .expect(200);

    const loginMembro = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailMembro, senha })
      .expect(200);

    const tokenAdmin = loginAdmin.body.access_token as string;
    const tokenMembro = loginMembro.body.access_token as string;

    const criacao = await request(app.getHttpServer())
      .post('/circulos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nome: 'Círculo Sucessão E2E' })
      .expect(201);

    circuloId = String(criacao.body.id);
    const codigoConvite = criacao.body.codigoConvite as string;

    // O participante entra no círculo antes da desativação.
    await request(app.getHttpServer())
      .post('/circulos/entrar')
      .set('Authorization', `Bearer ${tokenMembro}`)
      .send({ codigoConvite })
      .expect(201);

    // Desativa a conta do administrador pela API.
    const resposta = await request(app.getHttpServer())
      .delete(`/usuarios/${adminId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(204);

    expect(resposta.text).toBe('');

    const usuarios = await dataSource.query<
      Array<{ excluido_em: Date | null }>
    >(
      'SELECT excluido_em FROM usuario WHERE id_usuario = ?',
      [adminId],
    );

    expect(usuarios[0]?.excluido_em).not.toBeNull();

    const membros = await dataSource.query<
      Array<{ usuarioId: string; funcao: string }>
    >(
      `SELECT
         fk_usuario_id_usuario AS usuarioId,
         funcao
       FROM membro_do_circulo
       WHERE fk_circulo_id_circulo = ?`,
      [circuloId],
    );

    // O membro ativo assume a administração.
    expect(membros).toHaveLength(1);
    expect(String(membros[0].usuarioId)).toBe(membroId);
    expect(membros[0].funcao).toBe('ADMINISTRADOR');

    const circulos = await dataSource.query<
      Array<{ deleted_at: Date | null }>
    >(
      'SELECT deleted_at FROM circulo WHERE id_circulo = ?',
      [circuloId],
    );

    expect(circulos[0]?.deleted_at).toBeNull();

    // O token da conta desativada deixa de funcionar.
    await request(app.getHttpServer())
      .get(`/usuarios/${adminId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(401);

    // O sucessor continua conseguindo acessar o círculo.
    await request(app.getHttpServer())
      .get(`/circulos/${circuloId}`)
      .set('Authorization', `Bearer ${tokenMembro}`)
      .expect(200);
  } finally {
    if (dataSource?.isInitialized) {
      const bancos = await dataSource.query<Array<{ banco: string }>>(
        'SELECT DATABASE() AS banco',
      );

      if (bancos[0]?.banco !== 'aurora_test') {
        throw new Error('Limpeza E2E bloqueada: banco incorreto.');
      }

      // Remove primeiro o círculo para respeitar as FKs.
      if (circuloId) {
        await dataSource.query(
          'DELETE FROM circulo WHERE id_circulo = ?',
          [circuloId],
        );
      }

      await dataSource.query(
        'DELETE FROM usuario WHERE email IN (?, ?)',
        [emailAdmin, emailMembro],
      );
    }
  }
}, 30_000);
















  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
