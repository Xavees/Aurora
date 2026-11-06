# Aurora Backend — Guia prático de Docker, DevContainer e MariaDB

> Guia de referência para desenvolvimento local do Aurora (NestJS, TypeScript, TypeORM e MariaDB). Os exemplos assumem que o serviço do banco no Compose se chama `db`, que o hostname na rede Docker é `db`, que o banco de desenvolvimento é `app_aurora` e que o usuário é `aurora`. Confira o `docker-compose.yml` e o `.env` caso esses valores mudem.

## 1. Entenda onde você está executando os comandos

| Ambiente | O que executar | Observação |
|---|---|---|
| **VS Code — DevContainer Aurora Backend** | `npm`, `npx`, `mariadb -h db ...`, `git` | O cliente `mariadb` funcionou nesse ambiente. O comando `docker` **não estava instalado** nele. |
| **Windows PowerShell / WSL / terminal do host** | `docker`, `docker compose` | Exige Docker Desktop/Engine em execução e o terminal no diretório do projeto (onde está o arquivo Compose). |
| **Prompt `MariaDB [app_aurora]>`** | Comandos SQL como `SHOW TABLES;` | Aqui **não** se executa `docker`, `npm` nem `git`. |

**Como reconhecer:** `node@...:/workspaces/aurora-backend$` é shell do DevContainer; `MariaDB [app_aurora]>` é cliente SQL.

## 2. Entrar no MariaDB a partir do DevContainer (funcionou no Aurora)

No terminal integrado do VS Code, **dentro do DevContainer**:

```bash
mariadb -h db -P 3306 -u aurora -p app_aurora
```

- `-h db`: hostname do serviço do banco na rede interna do Docker.
- `-P 3306`: porta TCP do MariaDB.
- `-u aurora`: usuário do banco.
- `-p`: pede a senha interativamente, sem colocá-la no histórico do terminal.
- `app_aurora`: banco selecionado ao entrar.

Ao conectar, você verá `MariaDB [app_aurora]>`. Para sair, digite `exit;`.

**Não confunda:** esse comando **não executa Docker CLI**. Ele conecta diretamente ao servidor MariaDB que está em outro contêiner.

## 3. Comandos SQL para inspecionar o banco

Execute **dentro** do prompt `MariaDB [app_aurora]>`:

```sql
SELECT DATABASE();                         -- confirma o banco atual
SHOW DATABASES;                            -- lista bancos visíveis
SHOW TABLES;                               -- lista tabelas
DESCRIBE contato_de_emergencia;            -- campos, tipos e índices básicos
SHOW CREATE TABLE contato_de_emergencia\G  -- DDL completo, em formato vertical
SELECT * FROM contato_de_emergencia LIMIT 10; -- até 10 registros
SELECT COUNT(*) FROM contato_de_emergencia;   -- quantidade de registros
SHOW INDEX FROM contato_de_emergencia;     -- índices
```

> `\G` substitui `;` e facilita a leitura de tabelas extensas. Não digite `\G;`.

### Círculos do Aurora

```sql
DESCRIBE circulo;
SHOW CREATE TABLE circulo\G
SHOW CREATE TABLE membro_do_circulo\G
SELECT * FROM circulo LIMIT 10;
SELECT * FROM membro_do_circulo LIMIT 10;
```

Para verificar o relacionamento entre círculos e membros:

```sql
SELECT m.id_membro, m.fk_usuario_id_usuario, m.fk_circulo_id_circulo,
       c.nome AS nome_circulo
FROM membro_do_circulo AS m
JOIN circulo AS c ON c.id_circulo = m.fk_circulo_id_circulo
LIMIT 20;
```

**Atenção:** `SELECT`, `DESCRIBE` e `SHOW` são comandos de consulta. Evite `DROP`, `TRUNCATE`, `DELETE` ou `UPDATE` sem verificar o banco ativo e ter backup.

## 4. Docker CLI — executar no host (Windows/WSL), não no DevContainer atual

Abra um PowerShell/WSL onde `docker --version` funcione e entre na pasta que contém seu `docker-compose.yml`.

### Inspeção e diagnóstico

```bash
docker --version                 # versão da CLI
docker compose version          # versão do Compose
docker compose ps               # serviços do projeto e estados
docker ps                       # contêineres em execução
docker ps -a                    # todos, inclusive parados
docker compose config           # configuração Compose resolvida; cuidado com segredos na saída
```

### Iniciar, parar e reiniciar

```bash
docker compose up -d            # cria/inicia os serviços em segundo plano
docker compose stop             # para sem remover contêineres
docker compose start            # inicia contêineres já criados
docker compose restart db       # reinicia somente o serviço do banco
docker compose down             # remove contêineres e rede do projeto; preserva volumes nomeados por padrão
```

**Cuidado especial:** `docker compose down -v` **remove volumes do projeto**, podendo apagar os dados persistidos do MariaDB. Não use como rotina de desenvolvimento.

### Logs e saúde

```bash
docker compose logs db          # histórico de logs do serviço db
docker compose logs -f db       # acompanha logs em tempo real (Ctrl+C para sair)
docker compose logs --tail=100 db  # últimas 100 linhas
docker inspect <nome-ou-id>     # detalhes de um contêiner
docker stats                    # consumo de CPU, memória e rede
```

### Executar comandos dentro de contêineres

```bash
docker compose exec db mariadb -u aurora -p app_aurora
# Abre o cliente MariaDB DENTRO do contêiner db.

docker compose exec db sh
# Abre um shell no serviço db, caso tenha sh.
```

Se você já está no DevContainer do Aurora, prefira o acesso direto da seção 2.

### Imagens, volumes e limpeza

```bash
docker images                   # imagens disponíveis
docker volume ls                # volumes existentes
docker system df                # espaço ocupado pelo Docker
docker compose build            # reconstrói imagens de serviços que possuem build
```

Não execute `docker volume rm`, `docker system prune --volumes` ou `docker compose down -v` sem compreender quais dados serão removidos.

## 5. Fluxo rápido de diagnóstico do Aurora

**Se a API não consegue acessar o banco:**

1. No DevContainer, tente `mariadb -h db -P 3306 -u aurora -p app_aurora`.
2. Se conectar, use `SELECT DATABASE();` e `SHOW TABLES;`.
3. Se não conectar, no **host** rode `docker compose ps` e `docker compose logs --tail=100 db`.
4. Confirme as variáveis de ambiente do NestJS (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`), sem compartilhar senhas.
5. Depois de qualquer ajuste, execute os testes ou a inicialização da API para verificar a integração.

**Se a tabela existe no `.sql`, mas não no banco:** o arquivo SQL do repositório não é necessariamente aplicado automaticamente a um volume MariaDB já inicializado. Confira a tabela com `SHOW TABLES;` e a configuração de inicialização/migrações antes de modificar dados. **Não apague o volume para forçar a execução do SQL.**

## 6. Comandos para copiar e colar

| Objetivo | Onde | Comando |
|---|---|---|
| Entrar no banco | DevContainer | `mariadb -h db -P 3306 -u aurora -p app_aurora` |
| Ver tabelas | MariaDB | `SHOW TABLES;` |
| Ver colunas | MariaDB | `DESCRIBE circulo;` |
| Ver estrutura completa | MariaDB | `SHOW CREATE TABLE circulo\G` |
| Ver registros | MariaDB | `SELECT * FROM circulo LIMIT 10;` |
| Sair do banco | MariaDB | `exit;` |
| Ver serviços | Host | `docker compose ps` |
| Ver logs do banco | Host | `docker compose logs --tail=100 db` |
| Iniciar serviços | Host | `docker compose up -d` |
| Parar serviços | Host | `docker compose stop` |

---

**Sugestão de destino no repositório:** `docs/Docker-MariaDB.md`.

**Nota de segurança:** nunca registre senhas, tokens, conteúdo de `.env` ou dumps com dados pessoais em commits públicos. O banco `aurora_test` deve permanecer separado de `app_aurora`; confirme sempre `SELECT DATABASE();` antes de qualquer operação destrutiva.
