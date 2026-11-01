import { config } from 'dotenv';
import { resolve } from 'node:path';

// Carrega as credenciais exclusivas dos testes E2E.
const resultado = config({
  path: resolve(process.cwd(), '.env.e2e'),
  override: true,
});

if (resultado.error) {
  throw new Error('Não foi possível carregar o arquivo .env.e2e.');
}

// Ativa o ambiente de testes.
process.env.NODE_ENV = 'test';

// Impede o uso de credenciais ou banco incorretos.
if (
  process.env.DB_DATABASE !== 'aurora_test' ||
  process.env.DB_USERNAME !== 'aurora_e2e'
) {
  throw new Error(
    'Os testes E2E devem utilizar o usuário aurora_e2e e o banco aurora_test.',
  );
}