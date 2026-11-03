# Estratégia de Testes — Aurora Backend

## 1. Objetivo

Este documento descreve a estratégia de testes automatizados da API central do **Aurora**, desenvolvida com **NestJS**, **TypeScript**, **TypeORM** e **MariaDB**. Seu objetivo é tornar verificáveis os comportamentos de autenticação, autorização, validação HTTP, persistência e integridade dos dados, além de orientar a evolução da suíte.

A documentação apresenta os testes existentes, as decisões técnicas adotadas e um mapa de responsabilidades dos arquivos. A separação dos testes foi realizada e as suítes passaram após a refatoração; os nomes sugeridos no mapa devem ser conferidos com a árvore atual do repositório antes de serem tratados como caminhos existentes.

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

Também foi identificada a necessidade de **dividir e refatorar o código de testes**, pois concentrar numerosos cenários no mesmo arquivo dificulta manutenção, leitura, identificação de falhas e reutilização de preparação/limpeza. A separação por domínio e a extração de helpers são a organização-alvo apresentada na próxima seção. A separação dos testes foi realizada e as suítes foram executadas com sucesso após a refatoração. O mapa de nomes abaixo é uma referência de responsabilidades; deve ser confrontado com a árvore real de arquivos antes de ser declarado exato.

**Distinção:** dividir os arquivos melhora a manutenção, mas não elimina por si só o limite de requisições. A solução específica para os erros `429` foi o controle da dependência `ThrottlerGuard` no ambiente E2E.

## 7. Mapa de arquivos e responsabilidades

### Estrutura de referência atual

Os principais arquivos utilizados na implementação são:

```text

.

├── vitest.config.e2e.ts          # Descoberta e execução dos testes E2E

├── test/

│   ├── setup-e2e.ts              # Variáveis e travas do ambiente de teste

│   ├── ambiente.e2e-spec.ts      # Validação do isolamento do banco

│   ├── app.e2e-spec.ts           # Cenários HTTP E2E concentrados na suíte atual

│   └── helpers/                  # Local para helpers de criação da app e usuários

└── src/

    └── ...                      # Código da aplicação e testes unitários associados

```

### Mapa de responsabilidades após a divisão (nomes de referência)

```text

.

├── vitest.config.e2e.ts

├── test/

│   ├── setup-e2e.ts

│   ├── ambiente.e2e-spec.ts

│   │   └── Isolamento, credenciais e banco aurora_test

│   ├── app.e2e-spec.ts

│   │   └── Smoke test: inicialização e GET /

│   ├── auth/

│   │   ├── cadastro.e2e-spec.ts

│   │   │   └── Cadastro 201, e-mail duplicado 409, DTO de cadastro

│   │   └── login.e2e-spec.ts

│   │       └── Login 200, credenciais inválidas 401, JWT

│   ├── usuarios/

│   │   ├── consulta.e2e-spec.ts

│   │   │   └── GET: autenticação, autorização e parâmetros

│   │   ├── atualizacao.e2e-spec.ts

│   │   │   └── PATCH: persistência, autorização e DTOs

│   │   └── desativacao.e2e-spec.ts

│   │       └── DELETE: soft delete, autorização e JWT revogado na prática

│   ├── seguranca/

│   │   └── throttling.e2e-spec.ts

│   │       └── FUTURO: limites reais, 429 e janelas de tempo

│   └── helpers/

│       ├── criar-app-e2e.ts

│       │   └── Construção da aplicação e configuração comum

│       ├── usuario-e2e.helper.ts

│       │   └── Cadastro, login e criação de usuários de teste

│       └── limpeza-e2e.ts

│           └── FUTURO: limpeza segura com verificação do banco

└── src/

    └── modules/

        ├── auth/

        │   └── **/*.spec.ts      # Unitários: autenticação e regras isoladas

        └── usuarios/

            └── **/*.spec.ts      # Unitários: casos de uso e regras isoladas

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

*> Dependendo da configuração padrão do Vitest, o último comando pode descobrir testes E2E também. Recomenda-se manter uma configuração ou script próprio para unitários, com filtros explícitos, antes de documentá-lo como execução exclusivamente unitária.*

## 9. Cobertura: resultados e limites

- **Resultado funcional informado:** 20 testes E2E aprovados; execução dos testes unitários aprovada.

- **Cobertura percentual:** resultados das medições unitária e E2E apresentados a seguir.

- **Não coberto pela suíte E2E atual:** comportamento real de limitação de requisições.

- **Cenários adicionais recomendados:** JWT expirado; limites de tamanho e formato dos campos; falhas de persistência e tratamento de erros; limites numéricos de IDs `BIGINT`; testes de concorrência e regras futuras de círculos, contatos, localização e SOS.

A aprovação da suíte indica que os cenários especificados passaram no ambiente testado. **Não equivale à ausência de defeitos nem à cobertura integral do código.**

### Medições de cobertura realizadas (03/11/2026)

As medições utilizam `@vitest/coverage-v8` e incluem os arquivos de `src` mesmo quando não são executados. São execuções **independentes**: os percentuais não devem ser somados.

| Suíte | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Unitários (antes dos novos testes do repositório) | 24,29% | 14,70% | 29,54% | 24,52% |
| E2E | 92,01% | 64,70% | 100% | 91,94% |

Após a inclusão de **7 testes unitários** para `TypeOrmAuthRepository`, o arquivo `typeorm-auth.repository.ts` atingiu **100% nas quatro métricas unitárias**, conforme a execução informada. A cobertura global unitária atualizada ainda deve ser registrada após uma execução completa.

```bash
npx vitest run --coverage
npx vitest run --config vitest.config.e2e.ts --coverage
npx tsc --noEmit
```

O primeiro comando mede a cobertura unitária; o segundo, a E2E; o terceiro apenas verifica tipos. Configurar diretórios distintos para relatórios HTML evita sobrescrita.

**Lacunas relevantes na medição E2E:** `typeorm-usuario.repository.ts` (58,33% de branches), `global-exception.filter.ts` (57,69%) e `typeorm-auth.repository.ts` (25% de branches no E2E isolado). O último passou a ter cobertura unitária específica, mas isso não altera retroativamente a medição E2E.

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

- Manter a separação das suítes por domínio e conferir periodicamente o mapa de arquivos com a estrutura real do repositório.

- Implementar teste específico de throttling sem override do guard.

- Atualizar as métricas gerais de cobertura após mudanças relevantes e revisar caminhos condicionais críticos.

- Revisar validação de limites de IDs numéricos e demais entradas.

- Acrescentar testes para os novos módulos do Aurora conforme forem implementados.

## 12. Arquivos vermelhos na cobertura: significado e correção

Um arquivo marcado em **vermelho** na tabela de cobertura do Vitest indica baixa ou nenhuma execução **naquela suíte de testes**. **Não significa automaticamente falha de teste, erro no código ou bug.** A cor da cobertura e o resultado `passed`/`failed` são informações diferentes.

No Aurora, isso ocorreu quando a suíte unitária cobria principalmente os casos de uso, mas controllers, guards, DTOs e repositórios apareciam com 0%. Ao executar a cobertura E2E separadamente, várias dessas camadas apresentaram cobertura elevada. Portanto, é essencial distinguir o escopo de cada medição.

### Como investigar

1. **Conferir o resultado dos testes:** se o terminal indica `passed`, o vermelho do relatório representa cobertura insuficiente, não uma falha de execução.
2. **Verificar a suíte executada:** `npx vitest run --coverage` usa a configuração unitária; `npx vitest run --config vitest.config.e2e.ts --coverage` usa a E2E. Verificar também `coverage.include` e `coverage.exclude`.
3. **Identificar as linhas e branches descobertas:** consultar o relatório HTML e verificar se há caminhos de erro, validações ou regras de negócio não exercitados.
4. **Priorizar o risco:** criar testes para autenticação, autorização, persistência, erros e integridade dos dados antes de tentar aumentar percentuais de arquivos pouco críticos. Usar testes unitários para cenários isolados e E2E para fluxos completos.
5. **Validar novamente:** executar o teste específico, a checagem de tipos quando pertinente e a suíte completa. Registrar a nova cobertura sem buscar 100% artificialmente.

**Exemplo real:** o `typeorm-auth.repository.ts` apresentava 25% de branches nos E2E. Foram adicionados sete testes unitários cobrindo consulta, cadastro, erros de duplicidade e propagação de falhas; o arquivo atingiu 100% nas quatro métricas unitárias, sem alterar o código de produção.

## 13. Desenvolvimento por etapas e revisões de testes

O Aurora seguirá uma **estratégia incremental** para manter o ritmo de desenvolvimento. A cada nova funcionalidade, serão implementados os testes essenciais do fluxo principal e dos erros ou controles de segurança envolvidos. Não é necessário interromper toda a codificação para eliminar imediatamente cada linha vermelha de cobertura.

Ao finalizar um módulo ou conjunto de funcionalidades, a equipe deve executar os testes afetados, a suíte completa relevante e a verificação de tipos; em revisões periódicas, deve medir cobertura e acrescentar testes para lacunas de maior risco. Antes de integrar alterações à branch principal, confirmar a estabilidade dos testes e a proteção do banco E2E.

**Essa decisão não significa deixar toda a validação para o final.** Falhas reais, regressões de segurança e riscos de perda de dados devem ser resolvidos na etapa em que surgirem. O que pode ser planejado para uma revisão posterior são testes complementares de baixo risco e melhorias de cobertura que não bloqueiem o desenvolvimento.

Essa organização permite avançar para contatos de emergência, círculos, localização e SOS, voltando periodicamente à suíte para ampliar sua profundidade e manter a documentação atualizada.

---

**Projeto:** Aurora Backend  

**Natureza:** documentação técnica viva, sem vínculo com cronogramas ou numeração de etapas de desenvolvimento.
