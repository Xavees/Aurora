import type { INestApplication } from '@nestjs/common';

import type { App } from 'supertest/types.js';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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

  const idsCriadosPost: string[] = [];

  const idsUsuariosExtras: string[] = [];

  const criacao = '2026-01-01T12:00:00.000Z';

  const recente = '2026-01-02T12:00:00.000Z';

  const atualizacao = '2026-01-03T12:00:00.000Z';

  async function garantirBancoTeste() {

    const rows: Array<{ banco: string }> = await db.query(

      'SELECT DATABASE() AS banco',

    );

    if (rows[0]?.banco !== 'aurora_test') {

      throw new Error('Operação bloqueada fora de aurora_test.');

    }

  }

  async function limparFixtures() {

    await garantirBancoTeste();

    // Limpa apenas os registros criados por esta suíte.

    for (const id of idsCriadosPost) {

      await db.query('DELETE FROM area_de_risco WHERE id_area_risco = ?', [id]);

    }

    idsCriadosPost.length = 0;

    for (const id of idsFixture) {

      await db.query('DELETE FROM area_de_risco WHERE id_area_risco = ?', [id]);

    }

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

      { id: '820001', nivelRisco: 'BAIXO', status: 'VERIFICADA', data: criacao, excluido: false },

      { id: '820002', nivelRisco: 'MEDIO', status: 'VERIFICADA', data: recente, excluido: false },

      { id: '820003', nivelRisco: 'ALTO', status: 'VERIFICADA', data: recente, excluido: false },

      { id: '820004', nivelRisco: 'ALTO', status: 'PENDENTE', data: recente, excluido: false },

      { id: '820005', nivelRisco: 'MEDIO', status: 'REJEITADA', data: recente, excluido: false },

      { id: '820006', nivelRisco: 'BAIXO', status: 'VERIFICADA', data: recente, excluido: true },

      { id: '820007', nivelRisco: 'ALTO', status: null, data: recente, excluido: false },

      { id: '9007199254740993', nivelRisco: null, status: 'VERIFICADA', data: criacao, excluido: false },

    ];

    for (const item of dados) {

      await repo.insert({

        id: item.id,

        nome: 'Área teste ' + item.id,

        descricao: item.nivelRisco === null ? null : 'Descrição de teste',

        nivelRisco: item.nivelRisco,

        raioMetros: item.nivelRisco === null ? null : '100.25',

        latitude: '-23.55052000',

        longitude: '-46.63330800',

        tipoOrigem: item.status === null ? null : 'COLABORATIVA',

        statusVerificacao: item.status,

        fonte: null,

        dataReferencia: null,

        verificadoEm: item.status === 'VERIFICADA' ? new Date(atualizacao) : null,

        verificadoPorUsuarioId: null,

        excluidoEm: item.excluido ? new Date(atualizacao) : null,

        dataCriacao: new Date(item.data),

        dataAtualizacao: new Date(atualizacao),

        usuarioId: item.nivelRisco === null ? null : usuarioId,

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

  const editar = (id: string, body: Record<string, unknown>, jwt = token) =>

    request(app.getHttpServer())

      .patch(`${base}/${id}`)

      .set('Authorization', `Bearer ${jwt}`)

      .send(body);

  // DELETE reutiliza o token principal ou recebe um JWT alternativo.
  const excluir = (id: string, jwt = token) =>
    request(app.getHttpServer())
      .delete(`${base}/${id}`)
      .set('Authorization', `Bearer ${jwt}`);

  const ids = (body: { registros: Array<{ id: string }> }) =>

    body.registros.map((registro) => registro.id);

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

          await db.query('DELETE FROM usuario WHERE id_usuario = ?', [usuarioId]);

          for (const id of idsUsuariosExtras) {

            await db.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);

          }

        }

      }

    } finally {

      if (app) await app.close();

    }

  });

  describe('POST /areas-risco', () => {

    const dadosValidos = {

      nome: 'Rua com iluminação inoperante',

      descricao: 'Postes apagados durante a noite',

      nivelRisco: 'MEDIO',

      latitude: -23.55052,

      longitude: -46.633308,

      raioMetros: 150,

    };

    it('201 cria área colaborativa pendente vinculada ao usuário autenticado', async () => {

      const res = await request(app.getHttpServer())

        .post(base)

        .set('Authorization', `Bearer ${token}`)

        .send(dadosValidos)

        .expect(201);

      expect(res.body.id).toEqual(expect.any(String));

      const id = res.body.id as string;

      idsCriadosPost.push(id);

      expect(res.body).toMatchObject({ id, ...dadosValidos });

      expect(res.body).not.toHaveProperty('usuarioId');

      // Verifica a persistência real, não apenas a resposta HTTP.

      const registros: Array<{

        tipo_origem: string;

        status_verificacao: string;

        fk_usuario_id_usuario: string | number;

        verificado_em: Date | null;

        excluido_em: Date | null;

      }> = await db.query(

        `SELECT tipo_origem, status_verificacao, fk_usuario_id_usuario,

                verificado_em, excluido_em

         FROM area_de_risco WHERE id_area_risco = ?`,

        [id],

      );

      expect(registros).toHaveLength(1);

      expect(registros[0]).toMatchObject({

        tipo_origem: 'COLABORATIVA',

        status_verificacao: 'PENDENTE',

        verificado_em: null,

        excluido_em: null,

      });

      expect(String(registros[0].fk_usuario_id_usuario)).toBe(usuarioId);

      // Áreas pendentes não aparecem em consultas públicas autenticadas.

      await buscar(id).expect(404);

      const listagem = await listar().expect(200);

      expect(ids(listagem.body)).not.toContain(id);

    });

    it('401 impede cadastro sem autenticação', async () => {

      await request(app.getHttpServer()).post(base).send(dadosValidos).expect(401);

    });

    it('401 impede cadastro com token inválido', async () => {

      await request(app.getHttpServer())

        .post(base)

        .set('Authorization', 'Bearer token-invalido')

        .send(dadosValidos)

        .expect(401);

    });

    it.each([

      ['nome vazio', { nome: '' }],

      ['nome muito longo', { nome: 'A'.repeat(101) }],

      ['latitude inválida', { latitude: 91 }],

      ['longitude inválida', { longitude: -181 }],

      ['latitude como string', { latitude: '-23.55' }],

      ['nível inválido', { nivelRisco: 'CRITICO' }],

      ['raio negativo', { raioMetros: -10 }],

      ['raio com precisão excessiva', { raioMetros: 10.123 }],

      ['nome ausente', { nome: undefined }],

    ])('400 rejeita %s', async (_cenario, alteracao) => {

      await request(app.getHttpServer())

        .post(base)

        .set('Authorization', `Bearer ${token}`)

        .send({ ...dadosValidos, ...alteracao })

        .expect(400);

    });

    it.each([

      ['usuarioId', '999'],

      ['tipoOrigem', 'OFICIAL'],

      ['statusVerificacao', 'VERIFICADA'],

      ['verificadoPorUsuarioId', '999'],

      ['excluidoEm', '2026-01-01T12:00:00Z'],

    ])('400 impede manipulação de %s', async (campo, valor) => {

      await request(app.getHttpServer())

        .post(base)

        .set('Authorization', `Bearer ${token}`)

        .send({ ...dadosValidos, [campo]: valor })

        .expect(400);

    });

    it('201 aceita campos opcionais omitidos', async () => {

      const res = await request(app.getHttpServer())

        .post(base)

        .set('Authorization', `Bearer ${token}`)

        .send({

          nome: 'Área com dados mínimos',

          latitude: -23.55,

          longitude: -46.63,

        })

        .expect(201);

      const id = res.body.id as string;

      idsCriadosPost.push(id);

      expect(res.body).toMatchObject({

        id,

        nome: 'Área com dados mínimos',

        descricao: null,

        nivelRisco: null,

        raioMetros: null,

      });

      await buscar(id).expect(404);

    });

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

    for (const registro of res.body.registros) {

      expect(registro).not.toHaveProperty('usuarioId');

    }

  });

  it('oculta áreas pendentes, rejeitadas, sem status e excluídas', async () => {

    await semear();

    const res = await listar().expect(200);

    const registrosVisiveis = ids(res.body);

    expect(registrosVisiveis).toEqual([

      '820003', '820002', '9007199254740993', '820001',

    ]);

    expect(res.body.total).toBe(4);

    for (const id of ['820004', '820005', '820006', '820007']) {

      expect(registrosVisiveis).not.toContain(id);

    }

  });

  it.each([

    ['820004', 'pendente'],

    ['820005', 'rejeitada'],

    ['820006', 'excluída logicamente'],

    ['820007', 'sem verificação'],

  ])('retorna 404 para área %s (%s)', async (id) => {

    await semear();

    await buscar(id).expect(404);

  });

  it('não contabiliza áreas ocultas nos filtros e na paginação', async () => {

    await semear();

    const res = await listar({ nivelRisco: 'ALTO', pagina: 1, limite: 1 }).expect(200);

    expect(ids(res.body)).toEqual(['820003']);

    expect(res.body).toMatchObject({

      total: 1, pagina: 1, limite: 1, totalPaginas: 1,

    });

  });

  it.each([

    ['BAIXO', '820001'],

    ['MEDIO', '820002'],

    ['ALTO', '820003'],

  ])('filtra %s e conta somente os registros correspondentes', async (nivelRisco, id) => {

    await semear();

    const res = await listar({ nivelRisco }).expect(200);

    expect(ids(res.body)).toEqual([id]);

    expect(res.body).toMatchObject({

      total: 1, pagina: 1, limite: 20, totalPaginas: 1,

    });

    expect(res.body.registros[0].nivelRisco).toBe(nivelRisco);

    expect(res.body.registros[0]).not.toHaveProperty('usuarioId');

  });

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

        total: 4, pagina: i + 1, limite: 3, totalPaginas: 2,

      });

    }

  });

  it('combina filtro com paginação preservando o total filtrado', async () => {

    await semear();

    const res = await listar({ nivelRisco: 'ALTO', pagina: 2, limite: 1 }).expect(200);

    expect(res.body).toEqual({

      registros: [], total: 1, pagina: 2, limite: 1, totalPaginas: 1,

    });

  });

  it('aceita limite máximo 100', async () => {

    await semear();

    const res = await listar({ limite: 100 }).expect(200);

    expect(ids(res.body)).toEqual([

      '820003', '820002', '9007199254740993', '820001',

    ]);

    expect(res.body).toMatchObject({

      total: 4, pagina: 1, limite: 100, totalPaginas: 1,

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

    'abc', '1.5', '0', '-1', '-9223372036854775808',

    '9223372036854775808', '18446744073709551615', '01',

  ])('400 para ID inválido ou fora do intervalo: %s', async (id) => {

    await buscar(id).expect(400);

  });

  it.each([

    { pagina: 'abc' }, { pagina: '0' }, { pagina: '-1' },

    { pagina: '1.5' }, { limite: 'abc' }, { limite: '0' },

    { limite: '-1' }, { limite: '1.5' }, { limite: '101' },

    { nivelRisco: 'CRITICO' }, { nivelRisco: 'baixo' },

    { nivelRisco: '' }, { usuarioId: '42' },

    { ordenarPor: 'nome' }, { dataInicio: criacao },

  ])('400 para filtro inválido ou parâmetro não permitido: %j', async (query) => {

    await listar(query).expect(400);

  });

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

  describe('PATCH /areas-risco/:id', () => {

    it('200 permite ao autor atualizar parcialmente área verificada e envia para PENDENTE', async () => {

      await semear();

      const id = '820001';

      const res = await editar(id, { nome: 'Nome atualizado pelo autor' }).expect(200);

      expect(res.body).toMatchObject({

        id,

        nome: 'Nome atualizado pelo autor',

        descricao: 'Descrição de teste',

        nivelRisco: 'BAIXO',

        latitude: -23.55052,

        longitude: -46.633308,

        raioMetros: 100.25,

      });

      expect(res.body).not.toHaveProperty('usuarioId');

      expect(res.body).not.toHaveProperty('statusVerificacao');

      // O status e os campos de moderação são conferidos diretamente no MariaDB.

      const rows: Array<{

        nome_area: string;

        status_verificacao: string;

        verificado_em: Date | null;

        fk_verificado_por_id_usuario: string | null;

        descricao_area: string | null;

      }> = await db.query(

        `SELECT nome_area, status_verificacao, verificado_em,

                fk_verificado_por_id_usuario, descricao_area

         FROM area_de_risco WHERE id_area_risco = ?`,

        [id],

      );

      expect(rows).toHaveLength(1);

      expect(rows[0]).toMatchObject({

        nome_area: 'Nome atualizado pelo autor',

        status_verificacao: 'PENDENTE',

        verificado_em: null,

        fk_verificado_por_id_usuario: null,

        descricao_area: 'Descrição de teste',

      });

      await buscar(id).expect(404);

      const listagem = await listar().expect(200);

      expect(ids(listagem.body)).not.toContain(id);

    });

    it('200 aceita null em campos opcionais sem alterar nome e coordenadas', async () => {

      await semear();

      const id = '820004';

      const res = await editar(id, {

        descricao: null,

        nivelRisco: null,

        raioMetros: null,

      }).expect(200);

      expect(res.body).toMatchObject({

        id,

        nome: `Área teste ${id}`,

        descricao: null,

        nivelRisco: null,

        raioMetros: null,

        latitude: -23.55052,

        longitude: -46.633308,

      });

      const rows: Array<{

        descricao_area: string | null;

        nivel_risco: string | null;

        raio_metros: string | null;

        status_verificacao: string;

      }> = await db.query(

        `SELECT descricao_area, nivel_risco, raio_metros, status_verificacao

         FROM area_de_risco WHERE id_area_risco = ?`,

        [id],

      );

      expect(rows).toHaveLength(1);

      expect(rows[0]).toMatchObject({

        descricao_area: null,

        nivel_risco: null,

        raio_metros: null,

        status_verificacao: 'PENDENTE',

      });

    });

    it('200 atualiza área recém-criada com BIGINT sem perder precisão', async () => {

      const criada = await request(app.getHttpServer())

        .post(base)

        .set('Authorization', `Bearer ${token}`)

        .send({ nome: 'Área para edição', latitude: -23.55, longitude: -46.63 })

        .expect(201);

      const id = criada.body.id as string;

      idsCriadosPost.push(id);

      const res = await editar(id, { nome: 'Área editada', raioMetros: 125.5 })

        .expect(200);

      expect(res.body).toMatchObject({ id, nome: 'Área editada', raioMetros: 125.5 });

      expect(res.body).not.toHaveProperty('usuarioId');

      await buscar(id).expect(404);

    });

    it('403 impede que outro usuário edite a área', async () => {

      await semear();

      const email = `areas-risco-outro-${Date.now()}@example.com`;

      const senha = 'OutraSenhaSegura123!';

      const cadastro = await request(app.getHttpServer())

        .post('/auth/register')

        .send({ nome: 'Outro Usuario Areas', email, senha })

        .expect(201);

      idsUsuariosExtras.push(String(cadastro.body.usuarioId));

      const login = await request(app.getHttpServer())

        .post('/auth/login')

        .send({ email, senha })

        .expect(200);

      await editar('820001', { nome: 'Alteração indevida' }, login.body.access_token as string)

        .expect(403);

      const rows: Array<{ nome_area: string }> = await db.query(

        'SELECT nome_area FROM area_de_risco WHERE id_area_risco = ?',

        ['820001'],

      );

      expect(rows[0]?.nome_area).toBe('Área teste 820001');

    });

    it('403 impede edição de área oficial', async () => {

      await semear();

      await garantirBancoTeste();

      await db.query(

        `UPDATE area_de_risco SET tipo_origem = 'OFICIAL' WHERE id_area_risco = ?`,

        ['820001'],

      );

      await editar('820001', { nome: 'Alteração indevida' }).expect(403);

      const rows: Array<{ nome_area: string }> = await db.query(

        'SELECT nome_area FROM area_de_risco WHERE id_area_risco = ?',

        ['820001'],

      );

      expect(rows[0]?.nome_area).toBe('Área teste 820001');

    });

    it('404 impede edição de área excluída logicamente', async () => {

      await semear();

      await editar('820006', { nome: 'Não deve editar' }).expect(404);

    });

    it('404 para área inexistente', async () => {

      await editar('1', { nome: 'Não existe' }).expect(404);

    });

    it.each(['abc', '0', '-1', '01', '9223372036854775808'])(

      '400 rejeita ID inválido no PATCH: %s',

      async (id) => {

        await editar(id, { nome: 'Novo nome' }).expect(400);

      },

    );

    it('400 rejeita corpo vazio', async () => {

      await editar('820001', {}).expect(400);

    });

    it.each([

      ['nome nulo', { nome: null }],

      ['nome vazio', { nome: '' }],

      ['nome excessivamente longo', { nome: 'A'.repeat(101) }],

      ['latitude nula', { latitude: null }],

      ['latitude fora do intervalo', { latitude: 91 }],

      ['longitude fora do intervalo', { longitude: -181 }],

      ['longitude como string', { longitude: '-46.63' }],

      ['nível inválido', { nivelRisco: 'CRITICO' }],

      ['raio negativo', { raioMetros: -1 }],

      ['raio com casas decimais excessivas', { raioMetros: 1.123 }],

      ['campo de autoria', { usuarioId: '99' }],

      ['campo de origem', { tipoOrigem: 'OFICIAL' }],

      ['campo de moderação', { statusVerificacao: 'VERIFICADA' }],

    ])('400 rejeita %s', async (_cenario, dados) => {

      await editar('820001', dados).expect(400);

    });

    it('401 impede PATCH sem autenticação', async () => {

      await request(app.getHttpServer())

        .patch(`${base}/820001`)

        .send({ nome: 'Não autorizado' })

        .expect(401);

    });

    it('401 impede PATCH com JWT inválido', async () => {

      await request(app.getHttpServer())

        .patch(`${base}/820001`)

        .set('Authorization', 'Bearer invalido')

        .send({ nome: 'Não autorizado' })

        .expect(401);

    });

  });

  describe('DELETE /areas-risco/:id', () => {
    it('204 exclui logicamente a área do autor, mantendo o registro e o status no banco', async () => {
      await semear();
      const id = '820001';

      const resposta = await excluir(id).expect(204);
      expect(resposta.text).toBe('');

      await garantirBancoTeste();
      const registros: Array<{
        id_area_risco: string | number;
        excluido_em: Date | string | null;
        status_verificacao: string;
        nome_area: string;
      }> = await db.query(
        `SELECT id_area_risco, excluido_em, status_verificacao, nome_area
         FROM area_de_risco WHERE id_area_risco = ?`,
        [id],
      );

      expect(registros).toHaveLength(1);
      expect(String(registros[0].id_area_risco)).toBe(id);
      expect(registros[0].excluido_em).not.toBeNull();
      expect(Number.isNaN(new Date(registros[0].excluido_em!).getTime())).toBe(false);
      expect(registros[0].status_verificacao).toBe('VERIFICADA');
      expect(registros[0].nome_area).toBe(`Área teste ${id}`);

      await buscar(id).expect(404);
      const listagem = await listar().expect(200);
      expect(ids(listagem.body)).not.toContain(id);
    });

    it.each([
      ['820004', 'PENDENTE'],
      ['820005', 'REJEITADA'],
    ] as const)('204 permite excluir área %s com status %s', async (id, status) => {
      await semear();
      await excluir(id).expect(204);

      const registros: Array<{ excluido_em: Date | null; status_verificacao: string }> =
        await db.query(
          'SELECT excluido_em, status_verificacao FROM area_de_risco WHERE id_area_risco = ?',
          [id],
        );
      expect(registros).toHaveLength(1);
      expect(registros[0].excluido_em).not.toBeNull();
      expect(registros[0].status_verificacao).toBe(status);
    });

    it('204 exclui uma área criada com ID BIGINT sem perda de precisão', async () => {
      const criada = await request(app.getHttpServer())
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Área para exclusão', latitude: -23.55, longitude: -46.63 })
        .expect(201);

      const id = criada.body.id as string;
      idsCriadosPost.push(id);
      expect(BigInt(id) > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);

      await excluir(id).expect(204);
      const registros: Array<{ excluido_em: Date | null }> = await db.query(
        'SELECT excluido_em FROM area_de_risco WHERE id_area_risco = ?',
        [id],
      );
      expect(registros).toHaveLength(1);
      expect(registros[0].excluido_em).not.toBeNull();
    });

    it('404 impede exclusão repetida e preserva a primeira data', async () => {
      await semear();
      const id = '820001';
      await excluir(id).expect(204);

      const primeira: Array<{ excluido_em: Date | string }> = await db.query(
        'SELECT excluido_em FROM area_de_risco WHERE id_area_risco = ?',
        [id],
      );
      await excluir(id).expect(404);
      const segunda: Array<{ excluido_em: Date | string }> = await db.query(
        'SELECT excluido_em FROM area_de_risco WHERE id_area_risco = ?',
        [id],
      );
      expect(segunda).toHaveLength(1);
      expect(new Date(segunda[0].excluido_em).getTime()).toBe(
        new Date(primeira[0].excluido_em).getTime(),
      );
    });

    it('403 impede que outro usuário exclua a área e não altera excluido_em', async () => {
      await semear();
      const email = `areas-delete-outro-${Date.now()}@example.com`;
      const senha = 'OutroUsuarioExclusao123!';
      const cadastro = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ nome: 'Outro Usuario Exclusao', email, senha })
        .expect(201);
      idsUsuariosExtras.push(String(cadastro.body.usuarioId));

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);

      await excluir('820001', login.body.access_token as string).expect(403);
      const registros: Array<{ excluido_em: Date | null }> = await db.query(
        'SELECT excluido_em FROM area_de_risco WHERE id_area_risco = ?',
        ['820001'],
      );
      expect(registros).toHaveLength(1);
      expect(registros[0].excluido_em).toBeNull();
    });

    it('403 impede exclusão de área oficial', async () => {
      await semear();
      await garantirBancoTeste();
      await db.query(
        "UPDATE area_de_risco SET tipo_origem = 'OFICIAL' WHERE id_area_risco = ?",
        ['820001'],
      );

      await excluir('820001').expect(403);
      const registros: Array<{ excluido_em: Date | null }> = await db.query(
        'SELECT excluido_em FROM area_de_risco WHERE id_area_risco = ?',
        ['820001'],
      );
      expect(registros).toHaveLength(1);
      expect(registros[0].excluido_em).toBeNull();
    });

    it('404 para área previamente excluída', async () => {
      await semear();
      await excluir('820006').expect(404);
    });

    it('404 para área inexistente', async () => {
      await excluir('1').expect(404);
    });

    it.each(['abc', '0', '-1', '01', '9223372036854775808'])(
      '400 para ID inválido no DELETE: %s',
      async (id) => {
        await excluir(id).expect(400);
      },
    );

    it('401 impede DELETE sem JWT', async () => {
      await request(app.getHttpServer()).delete(`${base}/820001`).expect(401);
    });

    it('401 impede DELETE com JWT inválido', async () => {
      await request(app.getHttpServer())
        .delete(`${base}/820001`)
        .set('Authorization', 'Bearer invalido')
        .expect(401);
    });
  });

});
