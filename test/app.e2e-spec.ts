import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAppE2E } from './helpers/app-e2e.js';

describe('Aplicação (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  beforeAll(async () => {
    app = await criarAppE2E();
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
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
