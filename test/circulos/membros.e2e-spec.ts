import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  criarFixtureCirculos,
  type FixtureCirculos,
} from './circulos-fixture.js';

describe('Círculos HTTP — participantes', () => {
  let fixture: FixtureCirculos;

  beforeAll(async () => {
    fixture = await criarFixtureCirculos();
  }, 30_000);
  afterAll(async () => {
    await fixture?.fechar();
  });

  it('registra entrada única e transfere a administração na saída', async () => {
    const { api } = fixture;
    const admin = await fixture.criarUsuario();
    const membro = await fixture.criarUsuario();
    const { id, caminho, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );
    const entrar = () =>
      api
        .post('/circulos/entrar')
        .set('Authorization', membro.authorization)
        .send({ codigoConvite });

    const entrada = await entrar().expect(201);
    expect(entrada.body).toEqual({
      id: expect.stringMatching(/^[1-9]\d*$/),
      circuloId: id,
      usuarioId: membro.id,
      funcao: 'MEMBRO',
      dataEntrada: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    await entrar().expect(409);
    const membros = await api
      .get(`${caminho}/membros`)
      .set('Authorization', membro.authorization)
      .expect(200);
    expect(membros.body).toHaveLength(2);
    expect(membros.body).toEqual(
      expect.arrayContaining([
        entrada.body,
        expect.objectContaining({
          usuarioId: admin.id,
          funcao: 'ADMINISTRADOR',
        }),
      ]),
    );

    const sair = `${caminho}/membros/eu`;
    await api
      .delete(sair)
      .set('Authorization', admin.authorization)
      .expect(204);
    await api
      .delete(sair)
      .set('Authorization', admin.authorization)
      .expect(404);
    const sucessor = await api
      .get(`${caminho}/membros`)
      .set('Authorization', membro.authorization)
      .expect(200);
    expect(sucessor.body).toEqual([
      { ...entrada.body, funcao: 'ADMINISTRADOR' },
    ]);

    await api
      .delete(sair)
      .set('Authorization', membro.authorization)
      .expect(204);
    await api
      .get(caminho)
      .set('Authorization', membro.authorization)
      .expect(404);
    await entrar().expect(404);
  });

  it('promove e rebaixa participantes e protege o último administrador', async () => {
    const { api } = fixture;
    const admin = await fixture.criarUsuario();
    const membro = await fixture.criarUsuario();
    const { caminho, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );
    await api
      .post('/circulos/entrar')
      .set('Authorization', membro.authorization)
      .send({ codigoConvite })
      .expect(201);
    const alterar = (ator: string, alvo: string, funcao: string) =>
      api
        .patch(`${caminho}/membros/${alvo}/funcao`)
        .set('Authorization', ator)
        .send({ funcao });

    await alterar(membro.authorization, membro.id, 'ADMINISTRADOR').expect(403);
    await alterar(admin.authorization, admin.id, 'MEMBRO').expect(409);
    await alterar(admin.authorization, membro.id, 'ADMINISTRADOR').expect(204);
    await alterar(admin.authorization, membro.id, 'ADMINISTRADOR').expect(409);
    await api
      .delete(`${caminho}/membros/${membro.id}`)
      .set('Authorization', admin.authorization)
      .expect(403);
    await alterar(membro.authorization, admin.id, 'MEMBRO').expect(204);
    const lista = await api
      .get(`${caminho}/membros`)
      .set('Authorization', admin.authorization)
      .expect(200);
    expect(lista.body).toHaveLength(2);
    expect(lista.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ usuarioId: admin.id, funcao: 'MEMBRO' }),
        expect.objectContaining({
          usuarioId: membro.id,
          funcao: 'ADMINISTRADOR',
        }),
      ]),
    );
  });

  it('bloqueia o retorno após remoção e permite nova entrada após desbloqueio', async () => {
    const { api } = fixture;
    const admin = await fixture.criarUsuario();
    const membro = await fixture.criarUsuario();
    const { caminho, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );
    const entrar = () =>
      api
        .post('/circulos/entrar')
        .set('Authorization', membro.authorization)
        .send({ codigoConvite });

    await entrar().expect(201);
    await api
      .delete(`${caminho}/membros/${admin.id}`)
      .set('Authorization', admin.authorization)
      .expect(409);
    await api
      .delete(`${caminho}/membros/${admin.id}`)
      .set('Authorization', membro.authorization)
      .expect(403);
    await api
      .delete(`${caminho}/membros/${membro.id}`)
      .set('Authorization', admin.authorization)
      .expect(204);
    await entrar().expect(403);
    const bloqueio = `${caminho}/bloqueios/${membro.id}`;
    await api
      .delete(bloqueio)
      .set('Authorization', membro.authorization)
      .expect(403);
    await api
      .delete(bloqueio)
      .set('Authorization', admin.authorization)
      .expect(204);
    await api
      .delete(bloqueio)
      .set('Authorization', admin.authorization)
      .expect(404);
    const lista = await api
      .get(`${caminho}/membros`)
      .set('Authorization', admin.authorization)
      .expect(200);
    expect(lista.body).toEqual([
      expect.objectContaining({ usuarioId: admin.id }),
    ]);
    await entrar().expect(201);
  });
});
