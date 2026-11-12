
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({
  path: resolve(process.cwd(), '.env'),
  quiet: true,
});

const SOURCE_DATABASE = 'app_aurora';
const TEST_DATABASE = 'aurora_test';
const LOCK_NAME = 'aurora_test_schema_reset';

/**
 * Recupera as definições atuais das tabelas.
 * Não copia os registros do banco de desenvolvimento.
 */
async function exportarEstrutura(connection) {
  const [tabelas] = await connection.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [SOURCE_DATABASE],
  );

  const estrutura = [];

  for (const { TABLE_NAME: nome } of tabelas) {
    const identificador =
      `${connection.escapeId(SOURCE_DATABASE)}.` +
      `${connection.escapeId(nome)}`;

    const [resultado] = await connection.query(
      `SHOW CREATE TABLE ${identificador}`,
    );

    estrutura.push({
      tabela: nome,
      sql: resultado[0]['Create Table'],
    });
  }

  return estrutura;
}

/**
 * Verifica se existem chaves estrangeiras apontando
 * para outros bancos de dados.
 */
async function validarReferencias(connection) {
  const [referencias] = await connection.query(
    `SELECT
       TABLE_NAME,
       REFERENCED_TABLE_SCHEMA
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ?
       AND REFERENCED_TABLE_SCHEMA IS NOT NULL
       AND REFERENCED_TABLE_SCHEMA <> ?`,
    [SOURCE_DATABASE, SOURCE_DATABASE],
  );

  if (referencias.length > 0) {
    throw new Error(
      'Existem chaves estrangeiras apontando para outros bancos.',
    );
  }
}

/**
 * Adquire uma trava exclusiva para a reconstrução.
 */
async function adquirirTrava(connection) {
  const [rows] = await connection.query(
    'SELECT GET_LOCK(?, 30) AS acquired',
    [LOCK_NAME],
  );

  if (rows[0]?.acquired !== 1) {
    throw new Error(
      'Não foi possível adquirir a trava do banco de testes.',
    );
  }

  console.log('Trava de reconstrução adquirida.');
}

/**
 * Libera a trava após a operação.
 */
async function liberarTrava(connection) {
  await connection.query(
    'SELECT RELEASE_LOCK(?) AS released',
    [LOCK_NAME],
  );

  console.log('Trava de reconstrução liberada.');
}

/**
 * Apaga e recria exclusivamente aurora_test.
 *
 * ATENÇÃO: todos os dados anteriores de testes
 * serão permanentemente excluídos.
 */
async function reconstruirBancoTeste(connection, estrutura) {
  if (
    SOURCE_DATABASE !== 'app_aurora' ||
    TEST_DATABASE !== 'aurora_test' ||
    SOURCE_DATABASE === TEST_DATABASE
  ) {
    throw new Error('Configuração de bancos não autorizada.');
  }

  if (!Array.isArray(estrutura) || estrutura.length === 0) {
    throw new Error('Estrutura de origem vazia.');
  }

  const destino = connection.escapeId(TEST_DATABASE);

  console.log('\nRecriando banco de testes...');

  await connection.query(`DROP DATABASE IF EXISTS ${destino}`);

  await connection.query(
    `CREATE DATABASE ${destino}
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci`,
  );

  await connection.query(`USE ${destino}`);

  try {
    // Desativa temporariamente a verificação de FKs
    // para permitir a criação em qualquer ordem.
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const item of estrutura) {
      await connection.query(item.sql);
      console.log(`Tabela criada: ${item.tabela}`);
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  // Confere se todas as tabelas foram criadas.
  const [tabelasCriadas] = await connection.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_TYPE = 'BASE TABLE'`,
    [TEST_DATABASE],
  );

  const nomesCriados = new Set(
    tabelasCriadas.map((row) => row.TABLE_NAME),
  );

  const faltantes = estrutura
    .map((item) => item.tabela)
    .filter((nome) => !nomesCriados.has(nome));

  if (
    tabelasCriadas.length !== estrutura.length ||
    faltantes.length > 0
  ) {
    throw new Error(
      `Reconstrução incompleta. Tabelas ausentes: ${faltantes.join(', ')}`,
    );
  }

  console.log(
    `\nBanco ${TEST_DATABASE} reconstruído com ${estrutura.length} tabelas.`,
  );
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: 'root',
    password: process.env.MYSQL_ROOT_PASSWORD,
  });

  try {
    // A trava deve ser obtida antes de consultar
    // e reconstruir a estrutura.
    await adquirirTrava(connection);

    try {
      const [bancos] = await connection.query(
        `SELECT SCHEMA_NAME
         FROM information_schema.SCHEMATA
         WHERE SCHEMA_NAME IN (?, ?)`,
        [SOURCE_DATABASE, TEST_DATABASE],
      );

      if (
        !bancos.some(
          (row) => row.SCHEMA_NAME === SOURCE_DATABASE,
        )
      ) {
        throw new Error('Banco de origem não encontrado.');
      }

      await validarReferencias(connection);

      const estrutura = await exportarEstrutura(connection);

      if (estrutura.length === 0) {
        throw new Error('Nenhuma tabela encontrada na origem.');
      }

      console.log(
        `Estrutura encontrada: ${estrutura.length} tabelas.`,
      );

      await reconstruirBancoTeste(connection, estrutura);

      console.log('\nPreparação concluída com sucesso.');
      console.log('app_aurora preservado.');
    } finally {
      await liberarTrava(connection);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Falha na preparação:', error.message);
  process.exitCode = 1;
});
