import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter.js';
import crypto from 'crypto';




describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Inicializa os módulos reais da aplicação.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

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

















  afterAll(async () => {
    // Encerra as conexões após os testes.
    if (app) {
      await app.close();
    }
  });
});