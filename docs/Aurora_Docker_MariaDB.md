# Documentação — Comandos Docker e MariaDB | Aurora

Este guia reúne os principais comandos para trabalhar com o Docker, DevContainer e MariaDB no backend do Aurora.

O objetivo é facilitar o acesso ao banco de dados, a consulta das tabelas e o gerenciamento dos contêineres durante o desenvolvimento.

## 1. Entendendo os terminais

No Aurora, trabalhamos com dois ambientes diferentes:

| Ambiente                 | Utilização                                                 |
| ------------------------ | ---------------------------------------------------------- |
| Terminal do DevContainer | Executar NestJS, npm, TypeScript e acessar o MariaDB       |
| Terminal do Windows/WSL  | Gerenciar contêineres, imagens, redes e volumes com Docker |

Importante: no nosso DevContainer, o comando `docker` não está disponível. Por isso, usamos o cliente `mariadb` para acessar diretamente o banco.

## 2. Acessar o MariaDB pelo DevContainer

Este é o comando que acabamos de utilizar e confirmamos que funciona:

```
mariadb -h db -P 3306 -u aurora -p app_aurora
```

| Parâmetro    | Significado                                 |
| ------------ | ------------------------------------------- |
| `mariadb`    | Inicia o cliente MariaDB                    |
| `-h db`      | Endereço do serviço do banco na rede Docker |
| `-P 3306`    | Porta do MariaDB                            |
| `-u aurora`  | Usuário do banco                            |
| `-p`         | Solicita a senha                            |
| `app_aurora` | Banco que será acessado                     |

Após a autenticação:

```
MariaDB [app_aurora]>
```

A partir daqui, os comandos são SQL.

### Consultar o banco

Listar todos os bancos disponíveis:

```
SHOW DATABASES;
```

Verificar qual banco está selecionado:

```
SELECT DATABASE();
```

Listar todas as tabelas:

```
SHOW TABLES;
```

Visualizar as colunas de uma tabela:

```
DESCRIBE circulo;
```

Visualizar a estrutura completa da tabela:

```
SHOW CREATE TABLE circulo\G
```

O `\G` exibe o resultado verticalmente, facilitando a leitura no terminal.

Visualizar os registros armazenados:

```
SELECT * FROM circulo LIMIT 10;
```

Contar quantos registros existem:

```
SELECT COUNT(*) FROM circulo;
```

Consultar os índices:

```
SHOW INDEX FROM circulo;
```

Consultar as chaves estrangeiras de uma tabela:

```
SELECT
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'membro_do_circulo'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

Sair do MariaDB:

```
exit;
```

## 3. Comandos Docker Compose

Execute estes comandos no terminal do Windows/WSL, dentro da pasta do projeto que contém o arquivo Docker Compose.

| Comando                     | Função                                      |
| --------------------------- | ------------------------------------------- |
| `docker compose up -d`      | Inicia os serviços em segundo plano         |
| `docker compose down`       | Para e remove os contêineres do projeto     |
| `docker compose ps`         | Mostra o estado dos serviços                |
| `docker compose stop`       | Para os serviços sem remover os contêineres |
| `docker compose start`      | Inicia serviços que estavam parados         |
| `docker compose restart db` | Reinicia somente o MariaDB                  |
| `docker compose logs db`    | Exibe os logs do banco                      |
| `docker compose logs -f db` | Acompanha os logs do banco em tempo real    |
| `docker compose config`     | Verifica a configuração final do Compose    |

### Acessar o MariaDB pelo Docker Compose

Fora do DevContainer, você também pode entrar diretamente no serviço `db`:

```
docker compose exec db mariadb -u aurora -p app_aurora
```

Para abrir um terminal dentro do contêiner do banco:

```
docker compose exec db sh
```

Para sair desse terminal:

```
exit
```

## 4. Comandos gerais do Docker

Estes comandos não dependem do Compose e ajudam a inspecionar o ambiente.

| Comando             | Função                                          |
| ------------------- | ----------------------------------------------- |
| `docker ps`         | Lista contêineres em execução                   |
| `docker ps -a`      | Lista todos os contêineres                      |
| `docker images`     | Lista imagens baixadas                          |
| `docker volume ls`  | Lista volumes                                   |
| `docker network ls` | Lista redes Docker                              |
| `docker info`       | Mostra informações do Docker Engine             |
| `docker stats`      | Mostra consumo de CPU e memória dos contêineres |
| `docker system df`  | Mostra o espaço utilizado pelo Docker           |

### Investigar um contêiner específico

Primeiro:

```
docker ps
```

Copie o nome ou ID do contêiner e utilize:

```
docker logs NOME_DO_CONTAINER
```

```
docker inspect NOME_DO_CONTAINER
```

```
docker exec -it NOME_DO_CONTAINER sh
```

O último comando abre um terminal interativo dentro do contêiner.

## 5. Volumes e persistência dos dados

No Aurora, o MariaDB utiliza um volume Docker para manter os dados entre reinicializações.

Para listar os volumes:

```
docker volume ls
```

Para inspecionar um volume:

```
docker volume inspect NOME_DO_VOLUME
```

Para verificar os volumes utilizados pelo serviço do banco:

```
docker inspect NOME_DO_CONTAINER
```

Cuidado com este comando:

```
docker compose down -v
```

Ele remove os contêineres e também os volumes associados ao projeto, incluindo volumes nomeados declarados no Compose. Isso pode apagar os dados persistidos do MariaDB.

Para desligar os serviços preservando os volumes nomeados, prefira:

```
docker compose down
```

## 6. Diagnóstico de problemas

| Problema                        | O que executar                                  |
| ------------------------------- | ----------------------------------------------- |
| Banco não conecta               | `docker compose ps`                             |
| MariaDB apresenta erros         | `docker compose logs db`                        |
| Contêiner reiniciando           | `docker inspect NOME_DO_CONTAINER`              |
| Porta 3306 ocupada              | `docker ps`                                     |
| Docker não responde             | `docker info`                                   |
| DevContainer sem comando Docker | Utilizar `mariadb -h db ...`                    |
| Verificar se o banco responde   | `mariadb -h db -P 3306 -u aurora -p app_aurora` |

## 7. Fluxo prático que usamos no Aurora

1\. Abrir o terminal do DevContainer

```
mariadb -h db -P 3306 -u aurora -p app_aurora
```

2\. Verificar as tabelas

```
SHOW TABLES;
```

3\. Inspecionar a estrutura

```
SHOW CREATE TABLE membro_do_circulo\G
```

4\. Consultar os dados

```
SELECT * FROM membro_do_circulo LIMIT 10;
```

5\. Sair do banco

```
exit;
```
