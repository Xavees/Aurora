import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  criarFixtureCirculos,
  type FixtureCirculos,
} from './circulos-fixture.js';

describe('Círculos HTTP — gestão e convites', () => {
  let fixture: FixtureCirculos;

  beforeAll(async () => {
    fixture = await criarFixtureCirculos();
  }, 30_000);
  afterAll(async () => {
    await fixture?.fechar();
  });

  it('cria, lista, consulta, renomeia e desativa o círculo', async () => {
    const { api } = fixture;
    const admin = await fixture.criarUsuario();
    const visitante = await fixture.criarUsuario();
    const { id, caminho, resposta } = await fixture.criarCirculo(
      admin.authorization,
    );
    expect(resposta).toEqual({
      id: expect.stringMatching(/^[1-9]\d*$/),
      nome: 'Família',
      codigoConvite: expect.stringMatching(/^[A-F0-9]{10}$/),
      dataCriacao: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    const lista = await api
      .get('/circulos')
      .set('Authorization', admin.authorization)
      .expect(200);
    expect(lista.body).toEqual([resposta]);
    const listaVisitante = await api
      .get('/circulos')
      .set('Authorization', visitante.authorization)
      .expect(200);
    expect(listaVisitante.body).toEqual([]);
    const detalhe = await api
      .get(caminho)
      .set('Authorization', admin.authorization)
      .expect(200);
    expect(detalhe.body).toEqual(resposta);
    await api
      .get(caminho)
      .set('Authorization', visitante.authorization)
      .expect(403);
    await api
      .get(`${caminho}/membros`)
      .set('Authorization', visitante.authorization)
      .expect(404);

    const atualizado = await api
      .patch(caminho)
      .set('Authorization', admin.authorization)
      .send({ nome: 'Vizinhança' })
      .expect(200);
    expect(atualizado.body).toEqual({ ...detalhe.body, nome: 'Vizinhança' });
    const excluido = await api
      .delete(caminho)
      .set('Authorization', admin.authorization)
      .expect(204);
    expect(excluido.text).toBe('');
    await api
      .get(caminho)
      .set('Authorization', admin.authorization)
      .expect(404);
    const ativos = await api
      .get('/circulos')
      .set('Authorization', admin.authorization)
      .expect(200);
    expect(ativos.body).toEqual([]);
    expect(
      await fixture.db.query(
        'SELECT deleted_at FROM circulo WHERE id_circulo = ?',
        [id],
      ),
    ).toEqual([{ deleted_at: expect.any(Date) }]);
    await api
      .post('/circulos/entrar')
      .set('Authorization', visitante.authorization)
      .send({ codigoConvite: detalhe.body.codigoConvite })
      .expect(404);
  });

  it('restringe operações administrativas e invalida o código anterior', async () => {
    const { api } = fixture;
    const admin = await fixture.criarUsuario();
    const membro = await fixture.criarUsuario();
    const visitante = await fixture.criarUsuario();
    const { caminho, codigoConvite } = await fixture.criarCirculo(
      admin.authorization,
    );

    await api
      .post('/circulos/entrar')
      .set('Authorization', membro.authorization)
      .send({ codigoConvite })
      .expect(201);
    await api
      .patch(caminho)
      .set('Authorization', membro.authorization)
      .send({ nome: 'Nome proibido' })
      .expect(403);
    await api
      .delete(caminho)
      .set('Authorization', membro.authorization)
      .expect(403);
    const renovar = `${caminho}/codigo-convite/renovar`;
    await api
      .post(renovar)
      .set('Authorization', membro.authorization)
      .expect(403);
    const antes = await api
      .get(caminho)
      .set('Authorization', admin.authorization)
      .expect(200);
    expect(antes.body).toMatchObject({ nome: 'Família', codigoConvite });

    const novo = await api
      .post(renovar)
      .set('Authorization', admin.authorization)
      .expect(200);
    expect(novo.body).toEqual({
      codigoConvite: expect.stringMatching(/^[A-F0-9]{10}$/),
    });
    expect(novo.body.codigoConvite).not.toBe(codigoConvite);
    await api
      .post('/circulos/entrar')
      .set('Authorization', visitante.authorization)
      .send({ codigoConvite })
      .expect(404);
    await api
      .post('/circulos/entrar')
      .set('Authorization', visitante.authorization)
      .send(novo.body)
      .expect(201);
  });
});
