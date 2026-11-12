
import { config } from 'dotenv';
import { resolve } from 'node:path';

// No ambiente local, carrega as credenciais exclusivas dos testes.
// No GitHub Actions, as credenciais serão fornecidas pelo workflow.
if (process.env.CI !== 'true') {
  const resultado = config({
    path: resolve(process.cwd(), '.env.e2e'),
    override: true,
  });

  if (resultado.error) {
    throw new Error('Não foi possível carregar o arquivo .env.e2e.');
  }
}

// Ativa o ambiente de testes.
process.env.NODE_ENV = 'test';

// Protege o banco de desenvolvimento contra execução acidental dos E2E.
if (
  process.env.DB_DATABASE !== 'aurora_test' ||
  process.env.DB_USERNAME !== 'aurora_e2e'
) {
  throw new Error(
    'Os testes E2E devem utilizar o usuário aurora_e2e e o banco aurora_test.',
  );
}
