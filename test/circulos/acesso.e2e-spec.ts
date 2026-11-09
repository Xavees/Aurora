import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  criarFixtureCirculos,
  type FixtureCirculos,
} from './circulos-fixture.js';

describe('Círculos HTTP — autenticação e validação', () => {
  let fixture: FixtureCirculos;

  beforeAll(async () => {
    fixture = await criarFixtureCirculos();
  }, 30_000);
  afterAll(async () => {
    await fixture?.fechar();
  });

  it.each([
    ['post', '/circulos'],
    ['get', '/circulos'],
    ['get', '/circulos/1'],
    ['patch', '/circulos/1'],
    ['delete', '/circulos/1'],
    ['post', '/circulos/entrar'],
    ['get', '/circulos/1/membros'],
    ['delete', '/circulos/1/membros/eu'],
    ['delete', '/circulos/1/membros/2'],
    ['patch', '/circulos/1/membros/2/funcao'],
    ['post', '/circulos/1/codigo-convite/renovar'],
    ['delete', '/circulos/1/bloqueios/2'],
  ] as const)('exige JWT em %s %s', async (metodo, caminho) => {
    const resposta = await fixture.api[metodo](caminho).expect(401);
    expect(resposta.body).toMatchObject({ statusCode: 401, path: caminho });
  });

  it('rejeita um token com assinatura adulterada', async () => {
    const { authorization } = await fixture.criarUsuario();
    const inicioAssinatura = authorization.lastIndexOf('.') + 1;
    const substituto = authorization[inicioAssinatura] === 'A' ? 'B' : 'A';
    const adulterado =
      authorization.slice(0, inicioAssinatura) +
      substituto +
      authorization.slice(inicioAssinatura + 1);
    await fixture.api
      .get('/circulos')
      .set('Authorization', adulterado)
      .expect(401);
  });

  it.each([
    ['post', '/circulos', { nome: 'ab' }],
    ['post', '/circulos', { nome: 'x'.repeat(101) }],
    ['post', '/circulos', { nome: 'Família', criadorId: '1' }],
    ['patch', '/circulos/1', { nome: null }],
    ['patch', '/circulos/1/membros/2/funcao', { funcao: 'DONO' }],
    ['post', '/circulos/entrar', { codigoConvite: '' }],
    ['post', '/circulos/entrar', { codigoConvite: '12345678901' }],
  ] as const)(
    'valida o corpo em %s %s (%j)',
    async (metodo, caminho, dados) => {
      const { authorization } = await fixture.criarUsuario();
      const resposta = await fixture.api[metodo](caminho)
        .set('Authorization', authorization)
        .send(dados)
        .expect(400);
      expect(resposta.body).toMatchObject({ statusCode: 400, path: caminho });
      expect(resposta.body.message).toEqual(
        expect.arrayContaining([expect.any(String)]),
      );
    },
  );

  it.each([
    '/circulos/0',
    '/circulos/-1',
    '/circulos/1.5',
    '/circulos/abc',
    '/circulos/9223372036854775808',
  ])('rejeita ID inválido em %s', async (caminho) => {
    const { authorization } = await fixture.criarUsuario();
    await fixture.api
      .get(caminho)
      .set('Authorization', authorization)
      .expect(400);
  });

  it('valida também o ID do usuário alvo', async () => {
    const { authorization } = await fixture.criarUsuario();
    await fixture.api
      .delete('/circulos/1/bloqueios/abc')
      .set('Authorization', authorization)
      .expect(400);
  });
});
