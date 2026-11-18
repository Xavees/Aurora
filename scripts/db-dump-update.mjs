// npm run db:dump:update

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

config({
  path: resolve(process.cwd(), '.env'),
  quiet: true,
});

const SOURCE_DATABASE = 'app_aurora';
const OUTPUT_FILE = resolve(process.cwd(), 'bancodeDadosTemp.sql');

/**
 * Recupera a estrutura atual das tabelas do banco.
 * Nenhum registro de usuário é exportado.
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

  if (tabelas.length === 0) {
    throw new Error('Nenhuma tabela encontrada no banco de origem.');
  }

  const estrutura = [];

  for (const { TABLE_NAME: nome } of tabelas) {
    const identificador =
      `${connection.escapeId(SOURCE_DATABASE)}.` +
      `${connection.escapeId(nome)}`;

    const [resultado] = await connection.query(
      `SHOW CREATE TABLE ${identificador}`,
    );

    estrutura.push({
      nome,
      sql: resultado[0]['Create Table'],
    });
  }

  return estrutura;
}

/**
 * Monta o conteúdo SQL para reconstruir as tabelas
 * em um banco previamente selecionado.
 *
 * FOREIGN_KEY_CHECKS = 0 permite recriar as tabelas
 * mesmo quando existem dependências entre elas.
 */
function gerarDump(estrutura) {
  const comandos = [
    '-- Aurora - Dump de estrutura',
    `-- Banco de origem: ${SOURCE_DATABASE}`,
    '-- Gerado automaticamente. Não editar manualmente.',
    '',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];

  for (const tabela of estrutura) {
    comandos.push(
      `DROP TABLE IF EXISTS \`${tabela.nome}\`;`,
      `${tabela.sql};`,
      '',
    );
  }

  comandos.push(
    'SET FOREIGN_KEY_CHECKS = 1;',
    '',
  );

  return comandos.join('\n');
}

/**
 * Grava primeiro em um arquivo temporário.
 * Só substitui o dump existente após a geração
 * e validação do conteúdo.
 */
async function salvarDump(conteudo) {
  if (
    !conteudo.includes('CREATE TABLE') ||
    !conteudo.includes('SET FOREIGN_KEY_CHECKS = 1;')
  ) {
    throw new Error('Dump inválido. Arquivo original preservado.');
  }

  const temporario = resolve(
    dirname(OUTPUT_FILE),
    `.aurora-dump-${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporario, conteudo, 'utf8');
    await rename(temporario, OUTPUT_FILE);
  } catch (error) {
    await unlink(temporario).catch(() => {});
    throw error;
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: 'root',
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: SOURCE_DATABASE,
  });

  try {
    console.log('Consultando estrutura do app_aurora...');

    const estrutura = await exportarEstrutura(connection);

    console.log(`${estrutura.length} tabelas encontradas.`);

    const conteudo = gerarDump(estrutura);

    await salvarDump(conteudo);

    console.log('\nDump atualizado com sucesso!');
    console.log(`Arquivo: ${OUTPUT_FILE}`);
    console.log('Banco original preservado.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Falha ao atualizar dump:', error.message);
  process.exitCode = 1;
});
