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

Os DTOs tornam explícito o formato esperado em cada operação e permitem separar dados de entrada da estrutura das tabelas. A validação em execução complementa a tipagem do TypeScript, que não valida automaticamente o JSON recebido pela API.

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
    └── usuarios/
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

Os caminhos são relativos à base HTTP configurada na aplicação.

As diretrizes de segurança incluem segredos por variáveis de ambiente, validação de entrada e controle de acesso aos recursos. Autenticar um usuário e autorizar uma operação são responsabilidades diferentes: um token válido deve ser acompanhado da verificação de acesso ao dado solicitado.

Dados como localização, contatos e alertas exigem atenção especial à propriedade dos registros e à exposição nas respostas e nos logs.

## Banco de dados

A modelagem relacional representa usuários, círculos, membros, contatos, dispositivos, alertas, áreas de risco, ocorrências, mensagens e histórico de localização.

O **TypeORM** realiza o mapeamento da aplicação para o esquema existente. A configuração utiliza **`synchronize: false`**, evitando alterações automáticas do banco a partir das entidades durante a inicialização.

As mudanças de esquema devem ser controladas e versionadas. Atualizar uma entidade TypeScript, por si só, não atualiza a estrutura do banco nessa configuração.

## Executando o projeto

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

Configure o arquivo `.env` de acordo com as chaves lidas pela aplicação. Se houver um `.env.example` no repositório, utilize-o como referência. Credenciais e segredos não devem ser versionados.

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

A base do projeto utiliza **Vitest**, **Oxlint** e **Prettier**. Os scripts disponíveis incluem:

```bash
npm run lint
npm run test
npm run test:e2e
```

A execução dos testes depende da configuração e dos recursos necessários a cada suíte. A presença dos scripts não representa uma declaração de cobertura completa.

A separação de responsabilidades favorece testes unitários das regras e dos serviços, testes de integração da persistência e testes de ponta a ponta dos contratos HTTP.

## Integração com o ecossistema

A comunicação dos clientes com a API utiliza contratos HTTP e dados JSON. Centralizar os contratos e as regras compartilhadas ajuda a manter o comportamento consistente entre Web e Android.

Compartilhar um banco entre aplicações não garante, isoladamente, consistência de validação ou autenticação. As integrações precisam respeitar as mesmas regras de acesso e os mesmos significados dos dados.

## Contexto acadêmico

O Aurora conecta o desenvolvimento de software à proposta de apoiar a segurança pessoal por meio de tecnologia. As escolhas técnicas valorizam a compreensão do problema, a organização do código e a construção de uma base que possa ser estudada, testada e mantida pela equipe.
