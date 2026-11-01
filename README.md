# Aurora · Back-end

> API para o ecossistema Aurora de segurança pessoal, desenvolvida com NestJS e TypeScript.

O **Aurora** é um projeto de segurança pessoal que reúne geolocalização, círculos de confiança, contatos de emergência e recursos de alerta. Seu ecossistema contempla uma aplicação Web, um aplicativo Android e a integração com dispositivos embarcados.

Este back-end concentra o desenvolvimento da API e das regras necessárias para apoiar esse ecossistema. A organização do projeto prioriza separação de responsabilidades, manutenção, testabilidade e integração entre diferentes clientes.

## Sobre o projeto

O Aurora foi desenvolvido como Trabalho de Conclusão de Curso em Desenvolvimento de Sistemas, conectando levantamento de requisitos, modelagem de dados, arquitetura de software e implementação.

A aplicação Web, construída com React e TypeScript, concentra recursos de consulta e gerenciamento. O aplicativo Android, desenvolvido em Java, contempla a interação móvel e a coleta de localização. O back-end fornece a base de comunicação e persistência para essas experiências.

Os principais conceitos de negócio do projeto são:

- **Usuários e autenticação:** identificação e acesso à plataforma.
- **Círculos e contatos de emergência:** organização da rede de confiança do usuário.
- **Localização e dispositivos:** associação entre usuários, dispositivos e registros de localização.
- **Áreas de risco e ocorrências:** informações que apoiam a consulta e a prevenção.
- **Alertas SOS e notificações:** comunicação de situações de emergência à rede de apoio.

Esses conceitos descrevem o domínio do Aurora; a disponibilidade de cada operação é definida pelos endpoints presentes na aplicação.

## Tecnologias

| Tecnologia | Papel no projeto |
| --- | --- |
| **TypeScript** | Tipagem estática e desenvolvimento da aplicação |
| **Node.js** | Ambiente de execução |
| **NestJS** | Módulos, controllers, providers e injeção de dependências |
| **TypeORM** | Mapeamento entre entidades e banco relacional |
| **MySQL / MariaDB** | Persistência relacional dos dados |
| **JWT** | Autenticação por token de acesso |
| **Argon2id** | Hash e verificação de senhas |
| **@nestjs/config** | Carregamento da configuração por ambiente |
| **Docker** | Containerização do ambiente de desenvolvimento |
| **Docker Compose** | Orquestração dos serviços da aplicação e do banco |
| **VS Code Dev Containers** | Desenvolvimento em ambiente isolado e padronizado |
| **Vitest** | Ferramenta de testes definida na base do projeto |
| **Oxlint e Prettier** | Análise estática e padronização de formatação |

O projeto utiliza módulos **ESM** e resolução **NodeNext**. Nesse modelo, imports relativos podem utilizar a extensão `.js` no código TypeScript para corresponder aos arquivos gerados no build.

## Arquitetura e organização

### Monólito modular

A orientação arquitetural do Aurora é um **monólito modular**: uma aplicação NestJS com responsabilidades organizadas em módulos de negócio.

A modularização permite manter autenticação, usuários e demais funcionalidades em contextos próprios, com dependências explícitas. O objetivo é preservar uma base simples de executar e manter, enquanto o código cresce de forma organizada.

O módulo define os componentes de uma funcionalidade, suas dependências e os providers que disponibiliza para outras partes da aplicação. A comunicação entre módulos deve ocorrer por contratos e serviços expostos de forma intencional.

### Separação de responsabilidades

O desenvolvimento parte da divisão entre entrada HTTP, comportamento da aplicação e persistência:

| Componente | Responsabilidade |
| --- | --- |
| **Controller** | Receber requisições, encaminhar os dados e construir a resposta HTTP |
| **DTO** | Definir o contrato dos dados recebidos ou enviados pela API |
| **Service / caso de uso** | Executar regras e coordenar operações da aplicação |
| **Repositório** | Encapsular o acesso e a persistência dos dados |
| **Entidade de persistência** | Mapear tabelas, colunas e relacionamentos no TypeORM |
| **Module** | Compor os componentes e configurar a injeção de dependências |

Essa divisão evita concentrar consultas ao banco e regras de negócio nos controllers. Também facilita testar comportamentos sem executar uma requisição HTTP completa.

### Clean Architecture como orientação

A proposta de organização aplica os princípios da **Clean Architecture de forma pragmática**, aprofundando a separação em camadas conforme a complexidade de cada módulo:

| Camada | Foco |
| --- | --- |
| **Presentation** | Transporte HTTP, controllers, DTOs e apresentação das respostas |
| **Application** | Casos de uso e coordenação das operações |
| **Domain** | Regras de negócio e contratos relevantes ao domínio |
| **Infrastructure** | TypeORM, banco de dados e integrações externas |

A diretriz é reduzir o acoplamento entre regras de negócio e detalhes de infraestrutura. Essa tabela representa a orientação arquitetural, sem exigir que todos os módulos possuam a mesma árvore de pastas.

Quando houver um domínio independente, suas regras não devem depender de HTTP ou do ORM. As entidades decoradas do TypeORM pertencem ao mapeamento de persistência e não equivalem, por si só, a um domínio independente de infraestrutura.

## Princípios e padrões de projeto

### Injeção de dependências e inversão de controle

O NestJS gerencia a criação e a resolução dos providers. Controllers e services recebem suas dependências pelo construtor, tornando explícito o que cada componente precisa para funcionar.

Nos pontos em que são utilizados contratos e tokens de injeção, o módulo associa a abstração à implementação concreta. Isso permite substituir um componente por uma implementação alternativa ou por um dublê em testes.

**Injeção de dependências** é o mecanismo utilizado pelo framework; **inversão de dependência** é o princípio que orienta o desenho dos contratos. Depender de uma classe concreta por injeção não garante, isoladamente, a aplicação desse princípio.

### Repository Pattern

O acesso aos dados é organizado por meio dos repositórios do TypeORM. A separação entre regras da aplicação e operações de persistência facilita centralizar consultas e manter o comportamento do banco fora da camada HTTP.

Contratos próprios de repositório podem ser introduzidos nos módulos que precisam de maior isolamento entre aplicação e ORM. Uma abstração adicional deve resolver uma necessidade concreta de manutenção ou teste.

### SOLID

Os princípios SOLID orientam as decisões de implementação:

| Princípio | Aplicação no desenho do projeto |
| --- | --- |
| **Responsabilidade única — SRP** | Separar transporte HTTP, regras, autenticação e persistência |
| **Aberto/fechado — OCP** | Criar pontos de extensão para comportamentos que realmente variam |
| **Substituição de Liskov — LSP** | Preservar os contratos ao substituir implementações |
| **Segregação de interfaces — ISP** | Definir contratos pequenos e relacionados às necessidades de quem os utiliza |
| **Inversão de dependência — DIP** | Usar abstrações nas fronteiras em que o desacoplamento traz benefício |

A adoção desses princípios é incremental: a existência de módulos ou classes não comprova, sozinha, sua aplicação.

### Contratos de dados com DTOs

Os DTOs tornam explícito o formato esperado em cada operação e permitem separar dados de entrada da estrutura das tabelas.

A validação em execução complementa a tipagem do TypeScript, que não valida automaticamente o JSON recebido pela API.

Dados controlados pelo servidor, como permissões e propriedade de recursos, devem ser definidos ou verificados pela aplicação.

### Extensibilidade e eventos

A proposta arquitetural também considera **Strategy** para políticas ou canais intercambiáveis, **Adapter** para integrações externas e **eventos de domínio** para desacoplar reações a fatos de negócio.

Por exemplo, um alerta SOS pode originar ações de notificação e atualização de localização. Para esse tipo de fluxo, a escolha do mecanismo deve considerar persistência, retentativas e idempotência: eventos apenas em memória não garantem entrega após uma falha do processo.

Esses padrões são possibilidades de evolução do desenho. Seu uso depende das necessidades dos módulos e não representa uma declaração de implementação de filas, workers ou processamento distribuído.

## Estrutura do código

A base da aplicação é organizada em torno destes diretórios:

```text
src/
├── main.ts
├── app.module.ts
├── config/
│   └── database/
└── modules/
    ├── auth/
    │   ├── application/
    │   ├── domain/
    │   ├── infrastructure/
    │   └── presentation/
    └── usuarios/
        ├── application/
        ├── domain/
        ├── infrastructure/
        └── presentation/
```

- **main.ts:** inicialização da aplicação e configuração da camada HTTP.
- **app.module.ts:** composição dos módulos da aplicação.
- **config/database:** configuração de conexão e integração com o banco.
- **modules/auth:** responsabilidades de autenticação.
- **modules/usuarios:** responsabilidades relacionadas aos usuários.

A estrutura apresentada resume a base do projeto. Novos contextos de negócio seguem a organização por módulos, com divisão interna proporcional à sua complexidade.

## Autenticação e segurança

A autenticação própria utiliza **JWT** para emissão de tokens de acesso e **Argon2id** para hash de senhas. O cadastro persiste o hash, e a verificação da senha ocorre durante o login.

As operações de autenticação são organizadas em:

| Método | Rota | Finalidade |
| --- | --- | --- |
| `POST` | `/auth/register` | Cadastrar um usuário |
| `POST` | `/auth/login` | Autenticar e obter um token de acesso |

O módulo de usuários também disponibiliza operações protegidas por autenticação:

| Método | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/usuarios/:id` | Consultar dados do próprio usuário |
| `PATCH` | `/usuarios/:id` | Atualizar parcialmente o próprio perfil |
| `DELETE` | `/usuarios/:id` | Solicitar a desativação da própria conta |

As operações protegidas exigem um token JWT válido e verificam se o usuário autenticado possui autorização para acessar ou modificar o recurso solicitado.

A desativação utiliza a abordagem de **soft delete**, permitindo preservar a integridade de relacionamentos que dependem do registro do usuário. A retenção, a anonimização e a eliminação de dados pessoais devem seguir as regras aplicáveis de privacidade e proteção de dados, incluindo a LGPD.

As diretrizes de segurança incluem:

- Segredos e credenciais armazenados em variáveis de ambiente.
- Validação de dados recebidos pela API.
- Controle de autenticação e autorização.
- Limitação de requisições para reduzir abusos.
- Proteção contra exposição de hashes de senha nas respostas HTTP.
- Separação entre dados de entrada, regras de negócio e persistência.

Dados como localização, contatos e alertas exigem atenção especial à propriedade dos registros e à exposição nas respostas e nos logs.

## Banco de dados

A modelagem relacional representa usuários, círculos, membros, contatos, dispositivos, alertas, áreas de risco, ocorrências, mensagens e histórico de localização.

O **TypeORM** realiza o mapeamento da aplicação para o esquema existente. A configuração utiliza **`synchronize: false`**, evitando alterações automáticas do banco a partir das entidades durante a inicialização.

As mudanças de esquema devem ser controladas e versionadas. Atualizar uma entidade TypeScript, por si só, não atualiza a estrutura do banco nessa configuração.

O desenvolvimento containerizado utiliza **MariaDB 10.4.32**, mantendo compatibilidade com o banco utilizado durante a construção inicial do projeto.

## Ambiente de desenvolvimento com Docker

O Aurora Backend disponibiliza um ambiente de desenvolvimento containerizado utilizando **Docker**, **Docker Compose** e **VS Code Dev Containers**.

Essa configuração permite executar a aplicação e o banco de dados em serviços separados, com versões e dependências padronizadas.

A containerização facilita a configuração do projeto por outros integrantes da equipe e reduz diferenças entre ambientes de desenvolvimento.

### Organização dos serviços

O Docker Compose define dois serviços principais:

| Serviço | Responsabilidade |
| --- | --- |
| **app** | Ambiente Node.js utilizado para desenvolver e executar a API NestJS |
| **db** | Servidor MariaDB responsável pela persistência dos dados |

Os serviços compartilham uma rede Docker dedicada, permitindo que a aplicação se conecte ao banco pelo nome do serviço `db`.

### Portas utilizadas

| Serviço | Acesso | Porta |
| --- | --- | --- |
| API NestJS | `localhost` | `3000` |
| MariaDB pelo Windows | `127.0.0.1` | `3307` |
| MariaDB entre containers | `db` | `3306` |

A porta `3307` é utilizada para o acesso ao banco pelo sistema operacional, evitando conflitos com instalações locais do MySQL ou XAMPP que utilizem a porta `3306`.

Dentro da rede Docker, a aplicação utiliza a porta padrão `3306`.

### Estrutura do ambiente

```text
.devcontainer/
├── devcontainer.json
├── devcontainer-lock.json
├── docker-compose.yml
└── Dockerfile

.vscode/
└── tasks.json
```

Os arquivos possuem as seguintes responsabilidades:

- **devcontainer.json:** configura o ambiente de desenvolvimento integrado ao VS Code, incluindo extensões e comandos de inicialização.
- **devcontainer-lock.json:** registra as versões resolvidas dos recursos utilizados pelo Dev Container.
- **docker-compose.yml:** define os serviços, volumes, portas e rede.
- **Dockerfile:** define a imagem utilizada pelo ambiente da aplicação.
- **tasks.json:** disponibiliza tarefas de desenvolvimento no VS Code.

### Persistência e inicialização do banco

O MariaDB utiliza um **volume Docker** para armazenar os dados independentemente do ciclo de vida dos containers.

Isso permite reiniciar ou recriar os containers sem perder automaticamente os registros existentes.

O arquivo `bancodeDadosTemp.sql` é montado no diretório de inicialização do MariaDB e utilizado para preparar o esquema quando o diretório de dados está vazio.

**Importante:** o script de inicialização não é executado novamente sobre um volume já inicializado. Alterações futuras no esquema precisam ser aplicadas por um processo controlado, como migrações de banco de dados.

### Variáveis de ambiente

As configurações sensíveis são mantidas em um arquivo `.env` na raiz do projeto.

Entre as variáveis utilizadas estão:

```dotenv
# Autenticação
JWT_SECRET=
JWT_EXPIRES_IN=15m

# Inicialização do MariaDB
MYSQL_DATABASE=app_aurora
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_ROOT_PASSWORD=

# Conexão da API
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=app_aurora
```

Os valores de exemplo devem ser substituídos pelas configurações locais adequadas.

No ambiente Docker, o host da conexão é `db` e a porta interna do banco é `3306`, conforme definido no Docker Compose.

**O arquivo `.env` não deve ser versionado**, pois pode conter senhas, tokens e outras informações sensíveis.

### Como iniciar o ambiente

#### 1. Pré-requisitos

Instale:

- Docker Desktop, com o mecanismo de containers Linux disponível.
- Visual Studio Code.
- Extensão **Dev Containers**, da Microsoft.
- Git.

No Windows, o Docker Desktop pode utilizar o backend WSL 2.

#### 2. Preparar o projeto

Clone o repositório:

```bash
git clone https://github.com/Xavees/Aurora.git
```

Abra a pasta do projeto no Visual Studio Code e configure o arquivo `.env` na raiz.

#### 3. Abrir o Dev Container

No VS Code, pressione `Ctrl + Shift + P` e execute:

```text
Dev Containers: Reopen in Container
```

O VS Code utilizará os arquivos da pasta `.devcontainer` para construir e iniciar o ambiente.

Na primeira inicialização, esse processo pode levar mais tempo devido ao download das imagens, à instalação das dependências e à preparação do banco de dados.

#### 4. Iniciar a API

Após a abertura do ambiente, execute no terminal integrado:

```bash
npm run start:dev
```

Com a configuração padrão utilizada no desenvolvimento, a API estará disponível em:

```text
http://localhost:3000
```

#### 5. Verificar a aplicação

Para verificar a resposta HTTP da API:

```bash
curl -i http://localhost:3000/
```

As rotas protegidas exigem autenticação JWT.

### Comandos úteis do Docker

Os comandos abaixo podem ser executados em um terminal do sistema operacional, na raiz do repositório.

Verificar o estado dos containers:

```bash
docker ps
```

Consultar os logs do banco:

```bash
docker compose -f .devcontainer/docker-compose.yml logs db
```

Consultar os logs do ambiente da aplicação:

```bash
docker compose -f .devcontainer/docker-compose.yml logs app
```

Reiniciar o serviço do banco:

```bash
docker compose -f .devcontainer/docker-compose.yml restart db
```

O Docker Compose também pode ser administrado pela interface do Docker Desktop.

**Atenção:** remover volumes Docker pode apagar permanentemente os dados armazenados no banco. A remoção de volumes não faz parte do procedimento normal de inicialização ou reinicialização.

### Execução sem Docker

O projeto também permite execução local utilizando Node.js e uma instância compatível de MySQL/MariaDB.

Nesse cenário, é necessário configurar as variáveis de ambiente, preparar o esquema do banco e instalar as dependências manualmente.

O ambiente Docker é recomendado para padronizar a configuração entre os integrantes da equipe.

## Executando o projeto sem Dev Container

### Pré-requisitos

- Node.js em versão compatível com o `package.json`.
- npm.
- MySQL ou MariaDB configurado com o esquema utilizado pela aplicação.
- Variáveis de ambiente exigidas pela configuração do banco e da autenticação.

### Instalação

Na raiz do repositório:

```bash
npm install
```

Configure o arquivo `.env` de acordo com as chaves lidas pela aplicação.

Credenciais e segredos não devem ser versionados.

Como a sincronização automática está desativada, prepare o esquema do banco antes de executar operações que dependam das tabelas.

### Desenvolvimento

```bash
npm run start:dev
```

### Build

```bash
npm run build
```

O endereço, a porta e eventuais prefixos da API dependem da configuração HTTP do projeto.

## Testes e qualidade

A base do projeto utiliza **Vitest**, **Oxlint** e **Prettier**.

Os scripts disponíveis incluem:

```bash
npm run lint
npm run test
npm run test:e2e
```

A execução dos testes depende da configuração e dos recursos necessários a cada suíte. A presença dos scripts não representa uma declaração de cobertura completa.

A separação de responsabilidades favorece:

- **Testes unitários:** verificação isolada de regras e casos de uso.
- **Testes de integração:** verificação da persistência e comunicação entre componentes.
- **Testes end-to-end:** validação dos contratos HTTP e fluxos da aplicação.

O ambiente containerizado contribui para a reprodutibilidade dos testes que dependem do banco de dados.

## Integração com o ecossistema

A comunicação dos clientes com a API utiliza contratos HTTP e dados JSON. Centralizar os contratos e as regras compartilhadas ajuda a manter o comportamento consistente entre Web e Android.

Compartilhar um banco entre aplicações não garante, isoladamente, consistência de validação ou autenticação. As integrações precisam respeitar as mesmas regras de acesso e os mesmos significados dos dados.

A organização modular permite desenvolver novas funcionalidades sem concentrar todas as responsabilidades em um único componente.

O ambiente Docker atua na infraestrutura de desenvolvimento e não altera os contratos de comunicação utilizados pelas aplicações clientes.

## Contexto acadêmico

O Aurora conecta o desenvolvimento de software à proposta de apoiar a segurança pessoal por meio de tecnologia.

As escolhas técnicas valorizam a compreensão do problema, a organização do código e a construção de uma base que possa ser estudada, testada e mantida pela equipe.

A utilização de arquitetura modular, padrões de projeto, tipagem estática, autenticação, persistência relacional e containerização também permite aplicar conceitos de Engenharia de Software em um projeto integrado, envolvendo diferentes plataformas e responsabilidades.