import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { criarAppE2E } from '../helpers/app-e2e.js';

const senha = 'SenhaSegura123!';

export async function criarFixtureCirculos() {
  const app = await criarAppE2E();
  const db = app.get(DataSource);
  try {
    const linhas = await db.query<Array<{ banco: string; versao: string }>>(
      'SELECT DATABASE() AS banco, VERSION() AS versao',
    );
    if (
      linhas[0]?.banco !== 'aurora_test' ||
      !linhas[0].versao.includes('MariaDB')
    ) {
      throw new Error('Use um MariaDB descartável com o banco aurora_test.');
    }
  } catch (erro) {
    await app.close();
    throw erro;
  }

  const api = request(app.getHttpServer());
  const emails: string[] = [];
  const circulos: string[] = [];

  return {
    api,
    db,
    rastrearCirculo(id: string) {
      circulos.push(id);
    },
    async criarUsuario() {
      const email = `circulos-${randomUUID()}@example.com`;
      emails.push(email);
      const cadastro = await api
        .post('/auth/register')
        .send({ nome: 'Usuário Círculos', email, senha })
        .expect(201);
      const login = await api
        .post('/auth/login')
        .send({ email, senha })
        .expect(200);
      return {
        id: cadastro.body.usuarioId as string,
        authorization: `Bearer ${login.body.access_token as string}`,
      };
    },
    async criarCirculo(authorization: string, nome = 'Família') {
      const resposta = await api
        .post('/circulos')
        .set('Authorization', authorization)
        .send({ nome })
        .expect(201);
      const id = resposta.body.id as string;
      circulos.push(id);
      return {
        id,
        caminho: `/circulos/${id}`,
        codigoConvite: resposta.body.codigoConvite as string,
        resposta: resposta.body as unknown,
      };
    },
    async fechar() {
      try {
        for (const id of circulos) {
          // O schema de teste remove membros e bloqueios por cascata.
          await db.query('DELETE FROM circulo WHERE id_circulo = ?', [id]);
        }
        for (const email of emails) {
          await db.query('DELETE FROM usuario WHERE email = ?', [email]);
        }
      } finally {
        await app.close();
      }
    },
  };
}

export type FixtureCirculos = Awaited<ReturnType<typeof criarFixtureCirculos>>;
