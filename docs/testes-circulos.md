# Testes de Círculos

Os testes unitários usam Vitest e simulam os contratos dos repositórios dos 12 casos de uso. Os e2e usam Supertest, JWT emitido pelo login, os módulos reais do Nest e a configuração HTTP do helper e2e do projeto. A suíte MariaDB exercita os repositórios transacionais do TypeORM com conexões reais.

| Arquivos | Cenários |
| --- | --- |
| `src/modules/circulos/application/use-cases/{ciclo-de-vida,consultas,participacao,administracao,convites}.spec.ts` | Delegação, resultados, permissões, colisões e limite de tentativas |
| `test/circulos/acesso.e2e-spec.ts` | JWT ausente nas 12 rotas, assinatura adulterada, DTOs e limites de IDs |
| `test/circulos/gestao.e2e-spec.ts` | Criação, listagem, consulta, atualização, exclusão lógica e renovação de convite |
| `test/circulos/membros.e2e-spec.ts` | Entrada, saída, sucessão administrativa, funções, remoção, bloqueio e desbloqueio |
| `test/circulos/transacoes.mariadb-spec.ts` | Atomicidade na criação e remoção, rollback induzido por FK e trigger, índices únicos e convites de círculos desativados |
| `test/circulos/concorrencia.mariadb-spec.ts` | Entradas duplicadas, rebaixamentos, entrada durante remoção, saídas simultâneas e espera observável por bloqueio de linha |
| `test/circulos/circulos-fixture.ts`, `test/circulos/schema-circulos.sql`, `vitest.config.mariadb.ts` | Dados rastreados, complemento de schema e seleção das suítes MariaDB |

## Executar em um MariaDB descartável

Execute na raiz do repositório, com Docker ativo. O exemplo usa um contêiner novo, armazenamento em memória e uma porta local livre. A conta `aurora_e2e` tem acesso apenas ao banco `aurora_test`. Execute as suítes com banco em sequência.

```bash
set -e
docker run -d --rm --name aurora-circulos-test \
  --tmpfs /var/lib/mysql -p 127.0.0.1::3306 \
  -e MARIADB_RANDOM_ROOT_PASSWORD=1 -e MARIADB_DATABASE=aurora_test \
  -e MARIADB_USER=aurora_e2e -e MARIADB_PASSWORD=senha-local-de-testes \
  mariadb:10.4.32

# Aguarde o servidor aceitar conexões TCP antes de importar.
docker exec aurora-circulos-test mysql -h127.0.0.1 -uaurora_e2e \
  -psenha-local-de-testes aurora_test -e 'SELECT VERSION(), DATABASE()'

# O cliente 10.4 não reconhece o cabeçalho de sandbox na primeira linha do dump 10.11.
tail -n +2 bancodeDadosTemp.sql | docker exec -i aurora-circulos-test \
  mysql -uaurora_e2e -psenha-local-de-testes aurora_test
docker exec -i aurora-circulos-test mysql -uaurora_e2e \
  -psenha-local-de-testes aurora_test < test/circulos/schema-circulos.sql
docker port aurora-circulos-test 3306/tcp
```

Crie o arquivo local `.env.e2e`, substituindo `PORTA_DO_DOCKER` pela porta retornada pelo último comando.

```dotenv
DB_HOST=127.0.0.1
DB_PORT=PORTA_DO_DOCKER
DB_USERNAME=aurora_e2e
DB_PASSWORD=senha-local-de-testes
DB_DATABASE=aurora_test
JWT_SECRET=circulos-e2e-chave-local-com-mais-de-32-caracteres
```

```bash
npm ci
npx tsc --noEmit
npm run lint
npm run build
npm test
npm run test:e2e
npx vitest run --config vitest.config.mariadb.ts transacoes.mariadb-spec.ts
npx vitest run --config vitest.config.mariadb.ts concorrencia.mariadb-spec.ts
docker stop aurora-circulos-test
```

O helper HTTP existente desativa a limitação de requisições. Os testes de concorrência cobrem os interleavings descritos acima, com observação da consulta em espera no MariaDB em um cenário controlado. O schema de testes combina o dump versionado com um complemento próprio, incluindo FKs para a tabela de bloqueios. A suíte valida essa combinação em MariaDB 10.4.32.

## Resultado da execução

| Suíte | Aprovados no projeto | Aprovados em Círculos | Reprovados |
| --- | ---: | ---: | ---: |
| Unitários | 76 | 45 | 0 |
| E2E | 57 | 31 | 0 |
| Integração MariaDB | 5 | 5 | 0 |
| Concorrência MariaDB | 5 | 5 | 0 |

`tsc --noEmit` e o build passaram. O lint passou com 15 avisos preexistentes de `no-unsafe-finally` nas suítes de Auth e Usuários.

## Problemas reproduzidos na base ed309e5

### O SQL inicial falha ao ser importado

Importe `initialSQL.sql` em uma instância vazia e descartável de MariaDB 10.4.32 com `mysql -u aurora_e2e -p aurora_test < initialSQL.sql`. O cliente retorna `ERROR 1064 (42000) at line 30`. A linha 33 contém texto solto antes de `data_hora_fim`, dentro de `CREATE TABLE alerta_sos`.

### O dump alternativo está incompleto para o módulo

Em outro banco descartável, importe apenas `bancodeDadosTemp.sql`, removendo o cabeçalho conforme o exemplo. Execute `SHOW COLUMNS FROM circulo LIKE 'deleted_at';` e `SHOW TABLES LIKE 'bloqueio_circulo';`. Ambos retornam vazio. Os repositórios dependem da coluna e da tabela, e o TypeORM roda com `synchronize: false`. O complemento SQL desta suíte existe apenas no banco de testes.

### Nomes compostos só por espaços são aceitos

1. Cadastre e autentique um usuário, obtendo o JWT pelo `POST /auth/login`.
2. Envie `POST /circulos` com o JWT e o JSON `{"nome":"   "}`. A resposta foi `201` e retornou o nome com três espaços.
3. Como administrador, envie `PATCH /circulos/{id}` com `{"nome":"    "}`. A resposta foi `200` e uma consulta subsequente retornou o nome com quatro espaços.

Se nomes visualmente vazios forem inválidos, os dois pedidos deveriam retornar `400`. Os DTOs atuais verificam se a string está vazia e se o comprimento está entre 3 e 100, de modo que espaços contam como caracteres.
