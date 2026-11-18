import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { criarAppE2E } from '../helpers/app-e2e.js';
import { HistoricoLocalizacaoOrmEntity } from '../../src/modules/historico-localizacao/infrastructure/persistence/typeorm/entities/historico-localizacao.orm-entity.js';

describe('Histórico de localização (e2e, MariaDB real)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let titular: { id: string; token: string };
  let outro: { id: string; token: string };
  const usuariosCriados: string[] = [];
  const base = '/historico-localizacao/me';
  const senha = 'HistoricoSeguro123!';
  const inicio = '2026-01-01T12:00:00.000Z';
  const fim = '2026-01-02T12:00:00.000Z';

  async function garantirBancoTeste() {
    const rows: Array<{ banco: string }> = await db.query(
      'SELECT DATABASE() AS banco',
    );
    if (rows[0]?.banco !== 'aurora_test')
      throw new Error('Operação bloqueada fora de aurora_test.');
  }

  async function criarUsuario(sufixo: string) {
    const email = `historico-e2e-${sufixo}@example.com`;
    const cadastro = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ nome: 'Usuario Historico E2E', email, senha })
      .expect(201);
    const id = String(cadastro.body.usuarioId);
    usuariosCriados.push(id);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha })
      .expect(200);
    expect(login.body.access_token).toEqual(expect.any(String));
    return { id, token: login.body.access_token as string };
  }

  async function limparRegistros() {
    await garantirBancoTeste();
    for (const id of usuariosCriados) {
      await db.query(
        'DELETE FROM historico_localizacao WHERE fk_usuario_id_usuario = ?',
        [id],
      );
    }
  }

  // Horários distintos respeitam a chave única (usuário, data_hora_gps).
  async function semear() {
    await garantirBancoTeste();
    const repository = db.getRepository(HistoricoLocalizacaoOrmEntity);
    for (const [id, usuarioId, data] of [
      ['810001', titular.id, inicio],
      ['810002', titular.id, fim],
      ['810003', titular.id, '2026-01-03T12:00:00.000Z'],
      ['810099', outro.id, fim],
    ]) {
      await repository.insert({
        id,
        usuarioId,
        dispositivoId: null,
        latitude: '-23.5505200',
        longitude: '-46.6333080',
        altitudeMetros: '760.25',
        velocidadeKmh: null,
        satelites: 7,
        bateria: 80,
        sos: 0,
        dataHoraGps: new Date(data),
        recebidoEm: new Date('2026-01-03T12:00:00Z'),
        ipOrigem: '192.0.2.1',
      });
    }
  }

  const listar = (token: string, query: Record<string, string | number | undefined> = {}) =>
    request(app.getHttpServer())
      .get(base)
      .set('Authorization', `Bearer ${token}`)
      .query(query);
  const buscar = (id: string, token: string) =>
    request(app.getHttpServer())
      .get(`${base}/${id}`)
      .set('Authorization', `Bearer ${token}`);
  const ids = (body: { registros: Array<{ id: string }> }) =>
    body.registros.map((r) => r.id);

  beforeAll(async () => {
    app = await criarAppE2E();
    db = app.get(DataSource);
    await garantirBancoTeste();
    titular = await criarUsuario('titular');
    outro = await criarUsuario('outro');
  }, 30_000);

  beforeEach(async () => {
    await limparRegistros();
  });

  afterAll(async () => {
    try {
      if (db?.isInitialized) {
        await limparRegistros();
        for (const id of usuariosCriados)
          await db.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
      }
    } finally {
      if (app) await app.close();
    }
  });

  it('200 vazio com metadados padrão', async () => {
    const res = await listar(titular.token).expect(200);
    expect(res.body).toEqual({
      registros: [],
      total: 0,
      pagina: 1,
      limite: 20,
      totalPaginas: 0,
    });
  });

  it('200 com ordenação decrescente por data, sem dados de outro usuário', async () => {
    await semear();
    const res = await listar(titular.token).expect(200);
    expect(ids(res.body)).toEqual(['810003', '810002', '810001']);
    expect(res.body).toMatchObject({
      total: 3,
      pagina: 1,
      limite: 20,
      totalPaginas: 1,
    });
    expect(
      res.body.registros.every(
        (r: { usuarioId: string }) => r.usuarioId === titular.id,
      ),
    ).toBe(true);
    const segunda = await listar(outro.token).expect(200);
    expect(ids(segunda.body)).toEqual(['810099']);
    expect(segunda.body.total).toBe(1);
  });

  it.each([
    [{ dataInicio: fim }, ['810003', '810002']],
    [{ dataFim: inicio }, ['810001']],
    [{ dataInicio: fim, dataFim: fim }, ['810002']],
    [{ dataInicio: '2027-01-01T00:00:00Z' }, []],
    [
      {
        dataInicio: '2026-01-02T09:00:00-03:00',
        dataFim: '2026-01-02T09:00:00-03:00',
      },
      ['810002'],
    ],
  ] as Array<[Record<string, string>, string[]]>)(
    'filtra período inclusivo: %j',
    async (query, esperado) => {
      await semear();
      const res = await listar(titular.token, query).expect(200);
      expect(ids(res.body)).toEqual(esperado);
      expect(res.body.total).toBe(esperado.length);
    },
  );

  it('pagina sem duplicação e mantém contagem total, inclusive fora da última página', async () => {
    await semear();
    const p1 = await listar(titular.token, { pagina: 1, limite: 2 }).expect(
      200,
    );
    const p2 = await listar(titular.token, { pagina: 2, limite: 2 }).expect(
      200,
    );
    const p3 = await listar(titular.token, { pagina: 3, limite: 2 }).expect(
      200,
    );
    expect(ids(p1.body)).toEqual(['810003', '810002']);
    expect(ids(p2.body)).toEqual(['810001']);
    expect(ids(p3.body)).toEqual([]);
    for (const [index, res] of [p1, p2, p3].entries()) {
      expect(res.body).toMatchObject({
        total: 3,
        pagina: index + 1,
        limite: 2,
        totalPaginas: 2,
      });
    }
  });

  it('200 individual com contrato público e coordenadas numéricas', async () => {
    await semear();
    const res = await buscar('810001', titular.token).expect(200);
    expect(res.body).toEqual({
      id: '810001',
      usuarioId: titular.id,
      latitude: -23.55052,
      longitude: -46.633308,
      altitudeMetros: 760.25,
      velocidadeKmh: null,
      dataHoraGps: inicio,
      recebidoEm: '2026-01-03T12:00:00.000Z',
    });
  });

  it('404 para registro inexistente e BIGINT máximo válido sem perda de precisão', async () => {
    await buscar('18446744073709551615', titular.token).expect(404);
  });

  it('404 para registro de outro titular em ambas as direções', async () => {
    await semear();
    await buscar('810099', titular.token).expect(404);
    await buscar('810001', outro.token).expect(404);
    await buscar('810099', outro.token).expect(200);
  });

  it.each([base, `${base}/810001`])('401 sem JWT: %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });

  it.each([base, `${base}/810001`])(
    '401 com JWT inválido: %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    },
  );

  it.each(['abc', '1.5', '-1', '0', '18446744073709551616'])(
    '400 para ID inválido: %s',
    async (id) => {
      await buscar(id, titular.token).expect(400);
    },
  );

  it.each([
    { pagina: 'abc' },
    { pagina: '0' },
    { pagina: '-1' },
    { pagina: '1.5' },
    { limite: '101' },
    { limite: '0' },
    { dataInicio: 'invalida' },
    { dataFim: '2026-02-30T12:00:00Z' },
    { dataInicio: '2026-01-01T12:00:00' },
    { dataFim: '2026-01-01T12:00:00' },
    { dataInicio: fim, dataFim: inicio },
    { usuarioId: '123' },
  ])(
    '400 para query inválida ou tentativa de escolher usuário: %j',
    async (query) => {
      await listar(titular.token, query).expect(400);
    },
  );
});
