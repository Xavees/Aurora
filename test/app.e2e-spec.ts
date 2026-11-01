import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter.js';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { ThrottlerGuard } from '@nestjs/throttler';





// Desativa o rate limiting somente nos testes E2E
// que não estão verificando limites de requisições.
class ThrottlerGuardE2E extends ThrottlerGuard {
  override async canActivate(): Promise<boolean> {
    return true;
  }
}
// isso permite que burlemos o limite de requisições globalmente, sem precisar alterar o código da aplicação.








describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Inicializa os módulos reais da aplicação.
 const moduleFixture: TestingModule = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(ThrottlerGuard)
  .useClass(ThrottlerGuardE2E)
  .compile();

    app = moduleFixture.createNestApplication();

    // Reproduz as configurações globais do main.ts.
    app.useGlobalFilters(new GlobalExceptionFilter());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: false,
        },
      }),
    );

    await app.init();

    // Recupera a conexão TypeORM utilizada pela aplicação.
    dataSource = app.get(DataSource);
  }, 30_000);

  it('deve conectar exclusivamente ao banco aurora_test', async () => {
    // Consulta o banco realmente selecionado pelo MariaDB.
    const resultado: Array<{ banco: string }> = await dataSource.query(
      'SELECT DATABASE() AS banco',
    );

    expect(resultado[0]?.banco).toBe('aurora_test');
  });

  it('/ (GET) deve retornar Hello World!', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');



  });



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

      await dataSource.query(
        'DELETE FROM usuario WHERE email = ?',
        [email],
      );
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

    expect(resposta.body.access_token).toEqual(
      expect.any(String),
    );

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

      await dataSource.query(
        'DELETE FROM usuario WHERE email = ?',
        [email],
      );
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

      await dataSource.query(
        'DELETE FROM usuario WHERE email = ?',
        [email],
      );
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
});


// teste de autenticação.
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
    expect(cadastroA.body.usuarioId).not.toBe(
      cadastroB.body.usuarioId,
    );
  } finally {
    // Garante que a limpeza aconteça somente no banco E2E.
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





it('GET /usuarios/:id deve rejeitar JWT inválido', async () => {
  const resposta = await request(app.getHttpServer())
    .get('/usuarios/1')
    .set(
      'Authorization',
      'Bearer token.invalido.adulterado',
    )
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

      await dataSource.query(
        'DELETE FROM usuario WHERE email IN (?, ?)',
        [emailA, emailB],
      );
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
});


// validação de DTO'S

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
    const registros: Array<{ tipo_usuario: string }> =
      await dataSource.query(
        'SELECT tipo_usuario FROM usuario WHERE id_usuario = ?',
        [usuarioId],
      );

    expect(registros).toHaveLength(1);
    expect(registros[0]?.tipo_usuario).toBe('COMUM');
  } finally {
    // Limpeza protegida do banco E2E.
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
});



















  afterAll(async () => {
    // Encerra as conexões após os testes.
    if (app) {
      await app.close();
    }
  });
});