# Aurora Backend — Testes automatizados e integração contínua

> Guia da infraestrutura de testes E2E, preparação do banco MariaDB e execução no GitHub Actions.
>
> **Escopo:** configuração implementada em novembro de 2026. Os números de testes e a estrutura do banco são os observados durante essa implementação; atualize-os quando o projeto evoluir.

## 1. Objetivo

O backend Aurora utiliza **NestJS**, **TypeScript**, **TypeORM**, **MariaDB**, **Vitest** e **Supertest**. Organizamos os testes em dois ambientes:

- **Desenvolvimento local:** antes de executar os testes E2E, o projeto recria `aurora_test` usando **somente a estrutura** do banco `app_aurora`.
- **GitHub Actions (CI):** como o runner não tem acesso ao banco local, importa a estrutura versionada em `bancodeDadosTemp.sql` para `aurora_test` e então executa os testes.

Assim, os testes não devem utilizar o banco principal da aplicação nem depender de dados reais de desenvolvimento.

## 2. Arquivos envolvidos

| Arquivo | Responsabilidade |
| --- | --- |
| `scripts/db-test-reset.mjs` | Recria localmente o banco `aurora_test` a partir do schema de `app_aurora`, sem copiar registros. |
| `test/setup-e2e.ts` | Configura as variáveis dos testes E2E e impede o uso de outro banco/usuário. |
| `vitest.config.e2e.ts` | Configura a execução dos testes E2E com Vitest. |
| `package.json` | Define os comandos de execução local e no CI. |
| `bancodeDadosTemp.sql` | Dump versionado da estrutura usada para inicializar o banco no CI. |
| `.github/workflows/backend.yml` | Workflow do GitHub Actions: build, lint, tipos, testes unitários, schema e E2E. |
| `src/config/database/database.config.ts` | Obtém as credenciais e o endereço do banco a partir das variáveis de ambiente. |
| `src/config/database/database.module.ts` | Configura o TypeORM, desabilita sincronização automática e protege o banco usado nos testes. |

## 3. Execução local dos testes E2E

No Dev Container, na raiz do backend:

```bash
npm run test:e2e
```

O script encadeia duas etapas:

```json
{
  "db:test:reset": "node scripts/db-test-reset.mjs",
  "test:e2e": "npm run db:test:reset && vitest run --config ./vitest.config.e2e.ts",
  "test:e2e:ci": "vitest run --config ./vitest.config.e2e.ts"
}
```

**Fluxo local:**

1. `db-test-reset.mjs` conecta-se ao MariaDB com as credenciais administrativas configuradas no ambiente local.
2. Obtém um lock nomeado para evitar resets simultâneos.
3. Lê as definições `SHOW CREATE TABLE` do banco `app_aurora`.
4. **Apaga e recria `aurora_test`** e cria suas tabelas, sem copiar os registros do banco principal.
5. Verifica as tabelas criadas, libera o lock e encerra a conexão.
6. Somente se o reset terminar com sucesso, o Vitest inicia os testes E2E.

**Atenção:** `npm run db:test:reset` é destrutivo para `aurora_test`: qualquer dado anterior nesse banco é perdido. Ele **não deve** apagar `app_aurora`.

### Proteções

Em `test/setup-e2e.ts`, o projeto carrega `.env.e2e` e define `NODE_ENV=test`. A configuração verifica que:

```text
DB_DATABASE=aurora_test
DB_USERNAME=aurora_e2e
```

No módulo do banco, também há uma verificação para impedir que a aplicação em modo de teste se conecte a um banco diferente de `aurora_test`. O TypeORM usa `synchronize: false`, ou seja, não altera automaticamente o schema.

O arquivo `.env.e2e` é local e não deve ser publicado com credenciais reais.

## 4. Como o GitHub Actions funciona

Workflow: `.github/workflows/backend.yml` — **Aurora Backend CI**.

É acionado por eventos `push` e `pull_request` e utiliza um runner Ubuntu, Node.js 24 e um serviço MariaDB 10.4.32.

**Etapas configuradas:**

1. Checkout do repositório.
2. Configuração do Node.js e instalação via `npm ci`.
3. Build (`npm run build`).
4. Lint (`npm run lint`).
5. Verificação de tipos (`npx tsc --noEmit --incremental false`).
6. Testes unitários (`npm test`).
7. Importação de `bancodeDadosTemp.sql` no banco `aurora_test`.
8. Validação da estrutura importada (na implementação inicial, **12 tabelas** e **18 chaves estrangeiras**).
9. Testes E2E (`npm run test:e2e:ci`).

### Por que o CI usa outro comando?

No GitHub Actions não existe o banco de desenvolvimento `app_aurora` do computador local. Por isso, executar `npm run test:e2e` lá tentaria clonar uma origem inexistente.

O comando `npm run test:e2e:ci` **não executa o reset local**: ele apenas roda o Vitest, pois o workflow já preparou o banco a partir do SQL versionado.

### Importação do dump no CI

O comando ajustado no workflow foi:

```yaml
- name: Importar estrutura do banco de testes
  env:
    MYSQL_PWD: root-ci-only
  run: |
    tail -n +2 bancodeDadosTemp.sql | docker exec -i -e MYSQL_PWD="$MYSQL_PWD" "${{ job.services.db.id }}" mysql -uroot aurora_test
```

O exemplo acima é um **trecho**: no arquivo real, mantenha a indentação YAML dentro de `jobs.verify.steps`.

As credenciais de exemplo `root-ci-only` e `e2e-ci-only` são exclusivas do serviço temporário criado pelo workflow; não reutilize senhas reais nesse arquivo.

## 5. Erro encontrado: `Unknown command '\-'`

Nas primeiras execuções do CI, as etapas de build, lint, tipos e testes unitários passaram, mas a importação do SQL falhou com:

```text
ERROR at line 1: Unknown command '\-'.
```

A investigação revelou que **a primeira linha** de `bancodeDadosTemp.sql` era:

```sql
/*M!999999\- enable the sandbox mode */
```

Esse cabeçalho, gerado por uma versão mais recente da ferramenta de exportação do MariaDB, não era reconhecido pelo cliente `mysql` utilizado no contêiner MariaDB 10.4.32.

**Correção adotada:** usar `tail -n +2` para enviar ao cliente SQL todas as linhas **a partir da segunda**, sem alterar o dump original versionado. A mudança é adequada ao arquivo inspecionado, no qual a instrução incompatível estava na primeira linha.

> Se o dump for regenerado, verifique seu cabeçalho antes de manter essa solução. Remover sempre a primeira linha sem inspecioná-la pode descartar SQL válido caso o formato do arquivo mude.

As tentativas anteriores de reorganizar as quebras de linha do comando `docker exec` não resolveram a falha, pois a causa estava no conteúdo do dump, não na sintaxe do comando do shell.

## 6. Resultados observados

- **Local:** execução de `npm run test:e2e` concluída com **9 arquivos e 57 testes E2E aprovados**.
- **CI (primeira execução):** **16 arquivos e 76 testes unitários aprovados**; falha posterior na importação do SQL.
- **CI após a correção do cabeçalho:** o commit `e87973a` apareceu no GitHub com indicador **success**. Para confirmar o resultado detalhado, consulte o job e verifique se as etapas de importação, validação e E2E ficaram verdes.

Não confunda os 76 testes unitários com os 57 E2E: são suítes distintas.

## 7. Rotina de desenvolvimento

Ao modificar o schema ou criar novas tabelas:

1. Atualize o banco local `app_aurora` conforme o processo de desenvolvimento do projeto.
2. Rode `npm run test:e2e`: o reset local recriará `aurora_test` a partir da estrutura atual.
3. **Atualize e versione `bancodeDadosTemp.sql`** para que o CI use a mesma estrutura. O GitHub não lê automaticamente o banco local.
4. Se a quantidade de tabelas ou FKs mudar, atualize as expectativas da etapa de validação no workflow.
5. Execute build, lint e testes relevantes; faça commit e push.
6. Confira o resultado em [GitHub Actions — Aurora](https://github.com/Xavees/Aurora/actions).

### Comandos úteis

```bash
# Testes unitários
npm test

# Recriar somente o banco local de testes (destrutivo para aurora_test)
npm run db:test:reset

# Recriar o banco e executar os E2E locais
npm run test:e2e

# Executar apenas a suíte E2E (usado após a preparação do banco no CI)
npm run test:e2e:ci

# Verificar espaços indevidos antes de commitar
git diff --check
```

## 8. Cuidados e melhorias futuras

- O lock implementado no reset local protege **a etapa de recriação**, não necessariamente toda a duração dos testes E2E. Evite executar duas suítes E2E em paralelo sobre o mesmo `aurora_test`.
- A validação de 12 tabelas e 18 FKs confirma **quantidades**, não equivalência completa de colunas, índices e restrições.
- O dump SQL é uma fotografia do schema. Considere evoluir para **migrações versionadas** do TypeORM quando o projeto amadurecer.
- Não execute resets de teste apontando para bancos de produção.
- Não publique arquivos `.env` com segredos ou senhas de desenvolvimento.

---

**Resumo:** localmente, os testes E2E usam um clone estrutural atualizado de `app_aurora`; no CI, usam o dump versionado `bancodeDadosTemp.sql`. A separação evita que a suíte dependa de dados reais e permite verificar o backend automaticamente a cada push ou pull request.
