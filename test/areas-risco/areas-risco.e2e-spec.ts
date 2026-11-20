import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { criarAppE2E } from '../helpers/app-e2e.js';
import { AreaRiscoOrmEntity } from '../../src/modules/areas-risco/infrastructure/persistence/typeorm/entities/area-risco.orm-entity.js';

describe('Áreas de risco (e2e, MariaDB real)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let usuarioId: string | undefined;
  let token: string;
  const base = '/areas-risco';
  const idsFixture = [
  '820001',
  '820002',
  '820003',
  '820004',
  '820005',
  '820006',
  '820007',
  '9007199254740993',
];
  const criacao = '2026-01-01T12:00:00.000Z';
  const recente = '2026-01-02T12:00:00.000Z';
  const atualizacao = '2026-01-03T12:00:00.000Z';

  async function garantirBancoTeste() {
    const rows: Array<{ banco: string }> = await db.query(
      'SELECT DATABASE() AS banco',
    );
    if (rows[0]?.banco !== 'aurora_test')
      throw new Error('Operação bloqueada fora de aurora_test.');
  }

  async function limparFixtures() {
    await garantirBancoTeste();
    // Limpeza restrita aos IDs determinísticos desta suíte.
    for (const id of idsFixture)
      await db.query('DELETE FROM area_de_risco WHERE id_area_risco = ?', [id]);
  }

 
async function semear() {
  await garantirBancoTeste();

  const repo = db.getRepository(AreaRiscoOrmEntity);

  const dados: Array<{
    id: string;
    nivelRisco: 'BAIXO' | 'MEDIO' | 'ALTO' | null;
    status: 'PENDENTE' | 'VERIFICADA' | 'REJEITADA' | null;
    data: string;
    excluido: boolean;
  }> = [
    // Registros publicados.
    {
      id: '820001',
      nivelRisco: 'BAIXO',
      status: 'VERIFICADA',
      data: criacao,
      excluido: false,
    },
    {
      id: '820002',
      nivelRisco: 'MEDIO',
      status: 'VERIFICADA',
      data: recente,
      excluido: false,
    },
    {
      id: '820003',
      nivelRisco: 'ALTO',
      status: 'VERIFICADA',
      data: recente,
      excluido: false,
    },

    // Registros que não podem aparecer publicamente.
    {
      id: '820004',
      nivelRisco: 'ALTO',
      status: 'PENDENTE',
      data: recente,
      excluido: false,
    },
    {
      id: '820005',
      nivelRisco: 'MEDIO',
      status: 'REJEITADA',
      data: recente,
      excluido: false,
    },
    {
      id: '820006',
      nivelRisco: 'BAIXO',
      status: 'VERIFICADA',
      data: recente,
      excluido: true,
    },
    {
      id: '820007',
      nivelRisco: 'ALTO',
      status: null,
      data: recente,
      excluido: false,
    },

    // Registro com BIGINT acima de Number.MAX_SAFE_INTEGER.
    {
      id: '9007199254740993',
      nivelRisco: null,
      status: 'VERIFICADA',
      data: criacao,
      excluido: false,
    },
  ];

  for (const item of dados) {
    await repo.insert({
      id: item.id,
      nome: 'Área teste ' + item.id,
      descricao:
        item.nivelRisco === null ? null : 'Descrição de teste',

      nivelRisco: item.nivelRisco,
      raioMetros:
        item.nivelRisco === null ? null : '100.25',

      latitude: '-23.55052000',
      longitude: '-46.63330800',

      // Simulamos diferentes estados de publicação.
      tipoOrigem:
        item.status === null ? null : 'COLABORATIVA',
      statusVerificacao: item.status,

      fonte: null,
      dataReferencia: null,

      verificadoEm:
        item.status === 'VERIFICADA'
          ? new Date(atualizacao)
          : null,

      verificadoPorUsuarioId: null,

      excluidoEm:
        item.excluido
          ? new Date(atualizacao)
          : null,

      dataCriacao: new Date(item.data),
      dataAtualizacao: new Date(atualizacao),

      usuarioId:
        item.nivelRisco === null ? null : usuarioId,
    });
  }
}

  const listar = (query: Record<string, string | number | undefined> = {}) =>
    request(app.getHttpServer())
      .get(base)
      .set('Authorization', 'Bearer ' + token)
      .query(query);
  const buscar = (id: string) =>
    request(app.getHttpServer())
      .get(base + '/' + id)
      .set('Authorization', 'Bearer ' + token);
  const ids = (body: { registros: Array<{ id: string }> }) =>
    body.registros.map((r) => r.id);
  const publico = (
    id: string,
    nivelRisco: 'BAIXO' | 'MEDIO' | 'ALTO' | null,
    dataCriacao: string,
  ) => ({
    id,
    nome: 'Área teste ' + id,
    descricao: nivelRisco === null ? null : 'Descrição de teste',
    nivelRisco,
    raioMetros: nivelRisco === null ? null : 100.25,
    latitude: -23.55052,
    longitude: -46.633308,
    dataCriacao,
    dataAtualizacao: atualizacao,
  });

  beforeAll(async () => {
    app = await criarAppE2E();
    db = app.get(DataSource);
    await garantirBancoTeste();
    const email = 'areas-risco-e2e@example.com';
    const senha = 'AreasRiscoSegura123!';
    const cadastro = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ nome: 'Usuario Areas E2E', email, senha })
      .expect(201);
    usuarioId = String(cadastro.body.usuarioId);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha })
      .expect(200);
    expect(login.body.access_token).toEqual(expect.any(String));
    token = login.body.access_token as string;
  }, 30_000);

  beforeEach(async () => {
    await limparFixtures();
  });
  afterAll(async () => {
    try {
      if (db?.isInitialized) {
        await limparFixtures();
        if (usuarioId) {
          await garantirBancoTeste();
          await db.query('DELETE FROM usuario WHERE id_usuario = ?', [
            usuarioId,
          ]);
        }
      }
    } finally {
      if (app) await app.close();
    }
  });

  it('200 vazio com metadados padrão', async () => {
    const res = await listar().expect(200);
    expect(res.body).toEqual({
      registros: [],
      total: 0,
      pagina: 1,
      limite: 20,
      totalPaginas: 0,
    });
  });

  it('200 ordenado por data e ID com contrato público exato', async () => {
    await semear();
    const res = await listar().expect(200);
    expect(res.body).toEqual({
      registros: [
        publico('820003', 'ALTO', recente),
        publico('820002', 'MEDIO', recente),
        publico('9007199254740993', null, criacao),
        publico('820001', 'BAIXO', criacao),
      ],
      total: 4,
      pagina: 1,
      limite: 20,
      totalPaginas: 1,
    });
    for (const registro of res.body.registros)
      expect(registro).not.toHaveProperty('usuarioId');
  });


  
it('oculta áreas pendentes, rejeitadas, sem status e excluídas', async () => {
  await semear();

  const res = await listar().expect(200);

  const registrosVisiveis = ids(res.body);

  // Somente as quatro áreas verificadas e ativas.
  expect(registrosVisiveis).toEqual([
    '820003',
    '820002',
    '9007199254740993',
    '820001',
  ]);

  expect(res.body.total).toBe(4);

  const registrosOcultos = [
    '820004', // PENDENTE
    '820005', // REJEITADA
    '820006', // Excluída logicamente
    '820007', // Status desconhecido
  ];

  for (const id of registrosOcultos) {
    expect(registrosVisiveis).not.toContain(id);
  }
});

it.each([
  ['820004', 'pendente'],
  ['820005', 'rejeitada'],
  ['820006', 'excluída logicamente'],
  ['820007', 'sem verificação'],
])(
  'retorna 404 para área %s (%s)',
  async (id) => {
    await semear();

    await buscar(id).expect(404);
  },
);

it('não contabiliza áreas ocultas nos filtros e na paginação', async () => {
  await semear();

  // Existem áreas ALTO pendentes e sem verificação,
  // mas somente uma área ALTO está publicada.
  const res = await listar({
    nivelRisco: 'ALTO',
    pagina: 1,
    limite: 1,
  }).expect(200);

  expect(ids(res.body)).toEqual(['820003']);

  expect(res.body).toMatchObject({
    total: 1,
    pagina: 1,
    limite: 1,
    totalPaginas: 1,
  });
});






















  it.each([
    ['BAIXO', '820001'],
    ['MEDIO', '820002'],
    ['ALTO', '820003'],
  ])(
    'filtra %s e conta somente os registros correspondentes',
    async (nivelRisco, id) => {
      await semear();
      const res = await listar({ nivelRisco }).expect(200);
      expect(ids(res.body)).toEqual([id]);
      expect(res.body).toMatchObject({
        total: 1,
        pagina: 1,
        limite: 20,
        totalPaginas: 1,
      });
      expect(res.body.registros[0].nivelRisco).toBe(nivelRisco);
      expect(res.body.registros[0]).not.toHaveProperty('usuarioId');
    },
  );

  it('pagina com última página parcial e página além do fim', async () => {
    await semear();
    const p1 = await listar({ pagina: 1, limite: 3 }).expect(200);
    const p2 = await listar({ pagina: 2, limite: 3 }).expect(200);
    const p3 = await listar({ pagina: 3, limite: 3 }).expect(200);
    expect(ids(p1.body)).toEqual(['820003', '820002', '9007199254740993']);
    expect(ids(p2.body)).toEqual(['820001']);
    expect(ids(p3.body)).toEqual([]);
    for (const [i, res] of [p1, p2, p3].entries()) {
      expect(res.body).toMatchObject({
        total: 4,
        pagina: i + 1,
        limite: 3,
        totalPaginas: 2,
      });
    }
  });

  it('combina filtro com paginação preservando o total filtrado', async () => {
    await semear();
    const res = await listar({
      nivelRisco: 'ALTO',
      pagina: 2,
      limite: 1,
    }).expect(200);
    expect(res.body).toEqual({
      registros: [],
      total: 1,
      pagina: 2,
      limite: 1,
      totalPaginas: 1,
    });
  });

  it('aceita limite máximo 100', async () => {
    await semear();
    const res = await listar({ limite: 100 }).expect(200);
    expect(ids(res.body)).toEqual([
      '820003',
      '820002',
      '9007199254740993',
      '820001',
    ]);
    expect(res.body).toMatchObject({
      total: 4,
      pagina: 1,
      limite: 100,
      totalPaginas: 1,
    });
  });

  it('consulta individual omite usuarioId mesmo quando preenchido no banco', async () => {
    await semear();
    const res = await buscar('820001').expect(200);
    expect(res.body).toEqual(publico('820001', 'BAIXO', criacao));
    expect(res.body).not.toHaveProperty('usuarioId');
  });

  it('preserva nulos e ID acima de Number.MAX_SAFE_INTEGER', async () => {
    await semear();
    const res = await buscar('9007199254740993').expect(200);
    expect(res.body).toEqual(publico('9007199254740993', null, criacao));
  });

  it.each(['1', '9223372036854775807'])(
    '404 para ID válido inexistente: %s',
    async (id) => {
      await buscar(id).expect(404);
    },
  );

  it.each([
    'abc',
    '1.5',
    '0',
    '-1',
    '-9223372036854775808',
    '9223372036854775808',
    '18446744073709551615',
    '01',
  ])('400 para ID inválido ou fora do intervalo: %s', async (id) => {
    await buscar(id).expect(400);
  });

  it.each([
    { pagina: 'abc' },
    { pagina: '0' },
    { pagina: '-1' },
    { pagina: '1.5' },
    { limite: 'abc' },
    { limite: '0' },
    { limite: '-1' },
    { limite: '1.5' },
    { limite: '101' },
    { nivelRisco: 'CRITICO' },
    { nivelRisco: 'baixo' },
    { nivelRisco: '' },
    { usuarioId: '42' },
    { ordenarPor: 'nome' },
    { dataInicio: criacao },
  ])(
    '400 para filtro inválido ou parâmetro não permitido: %j',
    async (query) => {
      await listar(query).expect(400);
    },
  );

  it.each([base, base + '/820001'])('401 sem JWT: %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });
  it.each([base, base + '/820001'])(
    '401 com JWT inválido: %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer invalido')
        .expect(401);
    },
  );
});
