# Estratégia de Testes — Aurora Backend

## 1. Objetivo

Este documento descreve a estratégia de testes automatizados da API central do **Aurora**, desenvolvida com **NestJS**, **TypeScript**, **TypeORM** e **MariaDB**. Seu objetivo é tornar verificáveis os comportamentos de autenticação, autorização, validação HTTP, persistência e integridade dos dados, além de orientar a evolução da suíte.

A documentação apresenta os testes existentes, as decisões técnicas adotadas e uma **proposta de organização dos arquivos**. A estrutura proposta não deve ser confundida com uma refatoração já integralmente aplicada no repositório.

## 2. Tecnologias e níveis de teste

| Tecnologia | Papel |
| --- | --- |
| Vitest | Execução dos testes, asserções e relatórios |
| Supertest | Envio de requisições HTTP reais à aplicação de teste |
| `@nestjs/testing` | Criação do módulo de testes e configuração de dependências |
| TypeORM | Verificação de registros e alterações no banco |
| MariaDB | Persistência real nos testes E2E |
| Docker / Dev Container | Ambiente reproduzível de desenvolvimento e banco de dados |

**Testes unitários:** verificam comportamentos isolados de classes, serviços e regras de negócio, com dependências controladas quando necessário.

**Testes end-to-end (E2E):** exercitam o fluxo HTTP da aplicação, desde o controller e seus guards/pipes até a persistência no MariaDB de teste. Seu propósito não é apenas confirmar o código de resposta, mas também o estado final do banco.

## 3. Arquitetura e isolamento do ambiente E2E

O ambiente E2E usa um banco separado, **`aurora_test`**, em vez do banco de desenvolvimento **`app_aurora`**. A conta **`aurora_e2e`** possui permissões limitadas a `SELECT`, `INSERT`, `UPDATE` e `DELETE` sobre `aurora_test`.

O arquivo `test/setup-e2e.ts` carrega `.env.e2e`, define `NODE_ENV=test` e interrompe a execução caso `DB_DATABASE` não seja `aurora_test` ou `DB_USERNAME` não seja `aurora_e2e`. O `DatabaseModule` também protege contra o uso de um banco incorreto em modo de teste.

Antes da remoção de dados criados pelos cenários, a suíte confirma `SELECT DATABASE()` e só executa a limpeza quando o banco ativo é `aurora_test`. Cada teste utiliza e-mails exclusivos gerados com `randomUUID()`, reduzindo colisões entre execuções.

**Segredos e credenciais:** `.env.e2e` não deve ser versionado. Documente apenas os nomes das variáveis e os requisitos de configuração, nunca seus valores reais.

### Configuração de teste

A configuração `vitest.config.e2e.ts` seleciona arquivos `*.e2e-spec.ts`, executa `test/setup-e2e.ts` e desabilita paralelismo entre arquivos (`fileParallelism: false`) para reduzir interferências sobre o banco compartilhado de teste.

A aplicação E2E utiliza `ValidationPipe` com:

```ts
{
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
}
```

O filtro global de exceções também integra a aplicação de teste, permitindo verificar o formato das respostas HTTP.

## 4. Autenticação, autorização e segurança

- **Cadastro e login:** validação de respostas HTTP, rejeição de e-mail duplicado e de senha incorreta.
- **JWT:** bloqueio de acesso sem token, com token inválido e com token pertencente a usuário desativado.
- **Autorização por proprietário:** impede consultar, atualizar ou desativar a conta de outro usuário.
- **Soft delete:** confirma `204 No Content`, registro marcado como desativado e invalidação prática do acesso subsequente do usuário.
- **Integridade:** requisições rejeitadas não devem modificar dados protegidos.
- **DTOs:** rejeição de nome curto, telefone inválido, URL de foto sem HTTPS, propriedades não permitidas e IDs malformados na URL.

### Limitação importante: rate limiting

A aplicação utiliza `ThrottlerGuard`, mas os testes E2E atuais o substituem por `ThrottlerGuardE2E`, cujo `canActivate()` retorna `true`. Isso evita que a quantidade de requisições dos cenários de integração provoque respostas `429` e impeça a avaliação das demais regras.

**Consequência:** a suíte E2E atual **não comprova** o funcionamento do rate limiting. Esse comportamento deve ser validado em testes específicos, com a implementação real do guard e limites controlados.

## 5. Cenários automatizados confirmados

A execução conjunta foi informada como aprovada, com **20 testes E2E**, além da execução bem-sucedida dos testes unitários. O número de testes unitários e a porcentagem de cobertura não foram aferidos nesta documentação.

| Grupo | Cenários cobertos |
| --- | --- |
| Ambiente | Confirmação do isolamento e banco de testes |
| Cadastro | Cadastro bem-sucedido; conflito por e-mail duplicado |
| Login | Credenciais válidas; senha incorreta |
| Consulta de usuário | Ausência de JWT; JWT válido; acesso a outra conta; token inválido; token de conta desativada |
| Atualização de usuário | Atualização própria e persistência; bloqueio de alteração de terceiros; validação de nome, telefone, `fotoUrl` e campos extras |
| Desativação de usuário | Bloqueio da desativação de terceiros; soft delete próprio; invalidação do token após desativação |
| Parâmetros de rota | Rejeição de IDs como `abc`, `-1` e `1.5` |
| Rota base | Resposta da rota `GET /` |

A tabela agrupa comportamentos; **não representa uma correspondência de uma linha para cada teste**. Para uma contagem exata por arquivo, consulte a saída atual do Vitest.

## 6. Dificuldade encontrada: excesso de requisições nos testes

Durante a implementação da suíte, a quantidade de requisições de cadastro e login passou a acionar os limites configurados pelo `ThrottlerGuard`. Como resultado, testes que deveriam avaliar autenticação, autorização ou persistência recebiam respostas de limitação de requisições (`429`) e falhavam por um motivo externo ao comportamento que pretendiam verificar.

A correção envolveu **refatorar a configuração do guard**, registrando-o de modo que pudesse ser substituído no `TestingModule` exclusivamente durante os testes E2E. A suíte passou a utilizar um guard de teste que permite as requisições, preservando o `ThrottlerGuard` real na aplicação normal.

Também foi identificada a necessidade de **dividir e refatorar o código de testes**, pois concentrar numerosos cenários no mesmo arquivo dificulta manutenção, leitura, identificação de falhas e reutilização de preparação/limpeza. A separação por domínio e a extração de helpers são a organização-alvo apresentada na próxima seção. A migração integral dos cenários para os arquivos sugeridos deve ser conferida no repositório antes de ser declarada concluída.

**Distinção:** dividir os arquivos melhora a manutenção, mas não elimina por si só o limite de requisições. A solução específica para os erros `429` foi o controle da dependência `ThrottlerGuard` no ambiente E2E.

## 7. Mapa de arquivos e responsabilidades

### Estrutura de referência atual

Os principais arquivos utilizados na implementação são:

```text
.
├── vitest.config.e2e.ts          # Descoberta e execução dos testes E2E
├── test/
│   ├── setup-e2e.ts              # Variáveis e travas do ambiente de teste
│   ├── ambiente.e2e-spec.ts      # Validação do isolamento do banco
│   ├── app.e2e-spec.ts           # Cenários HTTP E2E concentrados na suíte atual
│   └── helpers/                  # Local para helpers de criação da app e usuários
└── src/
    └── ...                      # Código da aplicação e testes unitários associados
```

### Estrutura recomendada após a divisão completa

```text
.
├── vitest.config.e2e.ts
├── test/
│   ├── setup-e2e.ts
│   ├── ambiente.e2e-spec.ts
│   │   └── Isolamento, credenciais e banco aurora_test
│   ├── app.e2e-spec.ts
│   │   └── Smoke test: inicialização e GET /
│   ├── auth/
│   │   ├── cadastro.e2e-spec.ts
│   │   │   └── Cadastro 201, e-mail duplicado 409, DTO de cadastro
│   │   └── login.e2e-spec.ts
│   │       └── Login 200, credenciais inválidas 401, JWT
│   ├── usuarios/
│   │   ├── consulta.e2e-spec.ts
│   │   │   └── GET: autenticação, autorização e parâmetros
│   │   ├── atualizacao.e2e-spec.ts
│   │   │   └── PATCH: persistência, autorização e DTOs
│   │   └── desativacao.e2e-spec.ts
│   │       └── DELETE: soft delete, autorização e JWT revogado na prática
│   ├── seguranca/
│   │   └── throttling.e2e-spec.ts
│   │       └── FUTURO: limites reais, 429 e janelas de tempo
│   └── helpers/
│       ├── criar-app-e2e.ts
│       │   └── Construção da aplicação e configuração comum
│       ├── usuario-e2e.helper.ts
│       │   └── Cadastro, login e criação de usuários de teste
│       └── limpeza-e2e.ts
│           └── FUTURO: limpeza segura com verificação do banco
└── src/
    └── modules/
        ├── auth/
        │   └── **/*.spec.ts      # Unitários: autenticação e regras isoladas
        └── usuarios/
            └── **/*.spec.ts      # Unitários: casos de uso e regras isoladas
```

**Legenda:** arquivos marcados como **FUTURO** são sugestões, não implementações confirmadas. Os caminhos de testes unitários são ilustrativos: preserve a localização efetiva dos arquivos `.spec.ts` existentes. Os helpers `criar-app-e2e.ts` e `usuario-e2e.helper.ts` foram considerados durante a organização, mas seu conteúdo e adoção devem ser verificados.

### Regras para distribuir novos testes

| Teste novo | Arquivo de destino sugerido |
| --- | --- |
| Cadastro ou validação do cadastro | `test/auth/cadastro.e2e-spec.ts` |
| Login, credenciais ou emissão de JWT | `test/auth/login.e2e-spec.ts` |
| Consulta, acesso de terceiros ou ID inválido | `test/usuarios/consulta.e2e-spec.ts` |
| Atualização de perfil ou validação do DTO | `test/usuarios/atualizacao.e2e-spec.ts` |
| Soft delete e acesso após desativação | `test/usuarios/desativacao.e2e-spec.ts` |
| Comportamento real de `429` | `test/seguranca/throttling.e2e-spec.ts` |
| Regra isolada de caso de uso ou serviço | Arquivo unitário `.spec.ts` próximo ao código testado |

**Observação:** após a divisão, cada suíte deve preparar seus próprios dados e usar helpers compartilhados sem depender da ordem de execução de outros arquivos.

## 8. Como executar

Execute os comandos no ambiente de desenvolvimento com o banco de testes disponível e as variáveis de `.env.e2e` configuradas.

**Todos os E2E:**

```bash
npx vitest run --config vitest.config.e2e.ts
```

**Arquivo E2E específico:**

```bash
npx vitest run --config vitest.config.e2e.ts test/app.e2e-spec.ts
```

**Cenário E2E específico:**

```bash
npx vitest run --config vitest.config.e2e.ts test/app.e2e-spec.ts -t "GET /usuarios/:id deve rejeitar IDs inválidos"
```

**Comando utilizado para os testes unitários:**

```bash
npx vitest run
```

> Dependendo da configuração padrão do Vitest, o último comando pode descobrir testes E2E também. Recomenda-se manter uma configuração ou script próprio para unitários, com filtros explícitos, antes de documentá-lo como execução exclusivamente unitária.

## 9. Cobertura: resultados e limites

- **Resultado funcional informado:** 20 testes E2E aprovados; execução dos testes unitários aprovada.
- **Cobertura percentual:** ainda não medida ou apresentada neste documento.
- **Não coberto pela suíte E2E atual:** comportamento real de limitação de requisições.
- **Cenários adicionais recomendados:** JWT expirado; limites de tamanho e formato dos campos; falhas de persistência e tratamento de erros; limites numéricos de IDs `BIGINT`; testes de concorrência e regras futuras de círculos, contatos, localização e SOS.

A aprovação da suíte indica que os cenários especificados passaram no ambiente testado. **Não equivale à ausência de defeitos nem à cobertura integral do código.**

### Medição futura de cobertura

A medição deverá ser configurada com o provedor de cobertura compatível com a versão instalada do Vitest (por exemplo, `@vitest/coverage-v8`) e com critérios próprios para testes unitários e E2E. Depois de executar a medição, registrar aqui a data, os comandos, os percentuais de linhas/funções/branches e os módulos menos exercitados. Não preencher esses números por estimativa.

## 10. Diretrizes de manutenção

1. Cada cenário deve possuir nome que descreva comportamento e resultado esperado.
2. Criar dados próprios por teste, sem depender de registros pré-existentes.
3. Confirmar o banco ativo antes de qualquer limpeza destrutiva.
4. Testar tanto a resposta HTTP quanto a persistência quando houver alteração de estado.
5. Manter testes de autorização para toda rota que manipule recursos de um usuário.
6. Usar helpers para reduzir duplicação sem esconder as asserções importantes.
7. Não desabilitar controles de segurança em produção para facilitar testes.
8. Testar mecanismos substituídos por mocks/overrides em suítes dedicadas.
9. Atualizar a matriz de cenários e os comandos sempre que a estrutura de arquivos mudar.

## 11. Próximos passos

- Concluir e conferir a divisão física das suítes por domínio, preservando os testes existentes.
- Implementar teste específico de throttling sem override do guard.
- Configurar cobertura e registrar métricas verificáveis.
- Revisar validação de limites de IDs numéricos e demais entradas.
- Acrescentar testes para os novos módulos do Aurora conforme forem implementados.

---

**Projeto:** Aurora Backend  
**Natureza:** documentação técnica viva, sem vínculo com cronogramas ou numeração de etapas de desenvolvimento.
