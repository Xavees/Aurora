import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

import { criarAppE2E } from '../helpers/app-e2e.js';

describe('Contatos de emergência (e2e)', () => {
  let app: INestApplication<App>;
  let db: DataSource;

  const emails: string[] = [];
  const senha = 'SenhaSegura123!';

  async function criarUsuario() {
    const email = `contato-${randomUUID()}@example.com`;
    emails.push(email);

    const cadastro = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Usuario Contatos E2E',
        email,
        senha,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha })
      .expect(200);

    return {
      id: cadastro.body.usuarioId as string,
      token: login.body.access_token as string,
    };
  }

  beforeAll(async () => {
    app = await criarAppE2E();
    db = app.get(DataSource);
  }, 30_000);

  afterAll(async () => {
    try {
      if (db?.isInitialized) {
        const resultado: Array<{ banco: string }> = await db.query(
          'SELECT DATABASE() AS banco',
        );

        if (resultado[0]?.banco !== 'aurora_test') {
          throw new Error('Limpeza bloqueada: banco incorreto.');
        }

        // A chave estrangeira com ON DELETE CASCADE remove os contatos.
        for (const email of emails) {
          await db.query('DELETE FROM usuario WHERE email = ?', [email]);
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it('deve rejeitar acesso sem JWT', async () => {
    await request(app.getHttpServer())
      .get('/contatos-emergencia')
      .expect(401);
  });

  it('deve criar, listar, atualizar e remover o próprio contato', async () => {
    const usuario = await criarUsuario();
    const api = app.getHttpServer();
    const authorization = `Bearer ${usuario.token}`;

    const criacao = await request(api)
      .post('/contatos-emergencia')
      .set('Authorization', authorization)
      .send({
        nome: '  Maria  ',
        telefone: '11999999999',
        parentesco: 'Mãe',
      })
      .expect(201);

    const contatoId = criacao.body.id as string;

    expect(contatoId).toBeDefined();
    expect(criacao.body).toMatchObject({
      nome: 'Maria',
      telefone: '11999999999',
      parentesco: 'Mãe',
    });
    expect(criacao.body.usuarioId).toBeUndefined();

    const listagem = await request(api)
      .get('/contatos-emergencia')
      .set('Authorization', authorization)
      .expect(200);

    expect(listagem.body).toEqual([criacao.body]);

    const atualizacao = await request(api)
      .patch(`/contatos-emergencia/${contatoId}`)
      .set('Authorization', authorization)
      .send({
        nome: '  Maria Silva  ',
        parentesco: null,
      })
      .expect(200);

    expect(atualizacao.body).toMatchObject({
      id: contatoId,
      nome: 'Maria Silva',
      telefone: '11999999999',
      parentesco: null,
    });

    const registros: Array<{
      nome: string;
      parentesco: string | null;
    }> = await db.query(
      'SELECT nome, parentesco FROM contato_de_emergencia WHERE id_contato = ?',
      [contatoId],
    );

    expect(registros).toEqual([
      { nome: 'Maria Silva', parentesco: null },
    ]);

    await request(api)
      .delete(`/contatos-emergencia/${contatoId}`)
      .set('Authorization', authorization)
      .expect(204);

    const aposExclusao = await request(api)
      .get('/contatos-emergencia')
      .set('Authorization', authorization)
      .expect(200);

    expect(aposExclusao.body).toEqual([]);

    await request(api)
      .delete(`/contatos-emergencia/${contatoId}`)
      .set('Authorization', authorization)
      .expect(404);
  });

  it('deve impedir acesso aos contatos de outro usuário', async () => {
    const proprietario = await criarUsuario();
    const outroUsuario = await criarUsuario();
    const api = app.getHttpServer();

    const criacao = await request(api)
      .post('/contatos-emergencia')
      .set('Authorization', `Bearer ${proprietario.token}`)
      .send({
        nome: 'Contato Particular',
        telefone: '11988888888',
      })
      .expect(201);

    const contatoId = criacao.body.id as string;
    const authorization = `Bearer ${outroUsuario.token}`;

    const listagem = await request(api)
      .get('/contatos-emergencia')
      .set('Authorization', authorization)
      .expect(200);

    expect(listagem.body).toEqual([]);

    await request(api)
      .patch(`/contatos-emergencia/${contatoId}`)
      .set('Authorization', authorization)
      .send({ nome: 'Alteração indevida' })
      .expect(404);

    await request(api)
      .delete(`/contatos-emergencia/${contatoId}`)
      .set('Authorization', authorization)
      .expect(404);

    const registros: Array<{ nome: string }> = await db.query(
      'SELECT nome FROM contato_de_emergencia WHERE id_contato = ?',
      [contatoId],
    );

    expect(registros).toEqual([{ nome: 'Contato Particular' }]);
  });

  it('deve rejeitar dados inválidos na criação', async () => {
    const usuario = await criarUsuario();
    const api = app.getHttpServer();
    const authorization = `Bearer ${usuario.token}`;

    for (const dados of [
      { nome: '   ', telefone: '11999999999' },
      { nome: 'Maria', telefone: '123' },
      { nome: 'Maria', telefone: '11999999999', usuarioId: '999' },
    ]) {
      await request(api)
        .post('/contatos-emergencia')
        .set('Authorization', authorization)
        .send(dados)
        .expect(400);
    }

    const listagem = await request(api)
      .get('/contatos-emergencia')
      .set('Authorization', authorization)
      .expect(200);

    expect(listagem.body).toEqual([]);
  });

  it('deve rejeitar IDs inválidos e campos obrigatórios nulos', async () => {
    const usuario = await criarUsuario();
    const api = app.getHttpServer();
    const authorization = `Bearer ${usuario.token}`;

    for (const id of ['abc', '-1', '1.5']) {
      await request(api)
        .patch(`/contatos-emergencia/${id}`)
        .set('Authorization', authorization)
        .send({ nome: 'Maria' })
        .expect(400);

      await request(api)
        .delete(`/contatos-emergencia/${id}`)
        .set('Authorization', authorization)
        .expect(400);
    }

    const criacao = await request(api)
      .post('/contatos-emergencia')
      .set('Authorization', authorization)
      .send({
        nome: 'Maria',
        telefone: '11999999999',
      })
      .expect(201);

    for (const campo of ['nome', 'telefone']) {
      await request(api)
        .patch(`/contatos-emergencia/${criacao.body.id}`)
        .set('Authorization', authorization)
        .send({ [campo]: null })
        .expect(400);
    }

    const listagem = await request(api)
      .get('/contatos-emergencia')
      .set('Authorization', authorization)
      .expect(200);

    expect(listagem.body).toEqual([criacao.body]);
  });
});