# Registro de decisões técnicas — Aurora

Use este documento para registrar **o que foi decidido, por quê, alternativas e consequências**. Não confundir propostas com decisões aprovadas.

## DT-001 — NestJS e TypeScript

- **Status:** adotado no projeto inicial.
- **Decisão:** NestJS 12 com TypeScript 6, ESM e NodeNext.
- **Motivo:** estrutura modular, injeção de dependências e suporte à API REST.
- **Consequência:** imports relativos ESM com extensão `.js`.
- **Responsaveis:** Equipe01

## DT-002 — Banco relacional

- **Status:** adotado no projeto inicial.
- **Decisão:** MySQL com TypeORM e `synchronize: false`.
- **Motivo:** aproveitar o esquema relacional existente e controlar alterações.
- **Consequência:** revisar mapeamentos e criar migrations para evoluções.
- **Responsaveis:** Equipe01
## DT-003 — Testes e qualidade

- **Status:** ferramentas existentes no projeto; política de cobertura a definir.
- **Decisão:** Vitest, Oxlint e Prettier inicialmente.
- **Motivo:** É o que ta inserido no meu ambiente de estudo.
- **Alternativa:** migrar para Jest, caso haja necessidade concreta.
- **Responsaveis:** Equipe01
## DT-004 — Monólito modular

- **Status:** Confirmado.
- **Decisão proposta:** uma aplicação NestJS organizada por domínios.
- **Motivo:** menor custo operacional e separação lógica para crescimento.
- **Alternativa:** microsserviços desde o início, rejeitados por complexidade prematura.
- **Responsaveis:** Xavees
## DT-005 — Clean Architecture pragmática

- **Status:** Confirmado.
- **Decisão proposta:** camadas presentation/application/domain/infrastructure em módulos que justificarem essa separação.
- **Consequência:** melhor testabilidade, mas mais contratos e arquivos; evitar abstrações sem benefício.
- **Responsaveis:** Xavees
## DT-006 — Eventos para SOS

- **Status:** planejado, não implementado.
- **Decisão proposta:** persistir evento e alerta de forma atômica e processar notificações com mecanismo durável.
- **Motivo:** reduzir perda de eventos críticos e permitir retentativas.
- **A validar:** infraestrutura, canais, SLAs, consentimento e falhas de entrega.
- **Responsaveis:** Xavees
## DT-007 — Autenticação

- **Status:** pendente.
- **Alternativas:** autenticação própria no NestJS ou integração Firebase.
- **Contexto:** o SQL atual contém `firebase_uid` e `senha` opcional.
- **Próximo passo:** decidir antes de implementar cadastro/login.
- **Responsaveis:** Xavees

## DT-008 — SOFT DELETE
- Data: 29/10/2026
- Status: aprovado 
- Contexto: Funcionalidades dependem de usuario, usuario deletado do banco de dados = dados externos perdido.
- Decisão: Utilizar soft delete enquanto faz transição dos dados pra usuario anonimo
- Responsáveis: Xavees




## DT-009 — Exclusão logica de usuarios 
- Data: 26/10/2026
- Status: aprovado
- Contexto: A LGPD exige que o tratamento e a retenção dos dados tenham finalidade e fundamento legal adequado.
- Justificativa: preservar a integridade dos relacionamentos e permitir a retenção controlada de registros de segurança quando houver fundamento legítimo, sem manter dados pessoais desnecessariamente.
- Responsavel : Xavees


## DT-010 — Autenticação própria com NestJS e JWT, com suporte a Google OpenID Connect.
- Data: 26/10/2026
- Status: aprovado
- Contexto: Escolher AUTENTICADOR.
- Decisão: Escolhi fazer com funcionalidades integradas ao Nest, então o JWT será bem util!
- Alternativas consideradas: FireBase
- Responsáveis: Xavees


```






















## Modelo para novas decisões



```markdown
## DT-XXX — Título
- Data:
- Status: proposto | aprovado | substituído
- Contexto:
- Decisão:
- Alternativas consideradas:
- Consequências:
- Responsáveis:
```
