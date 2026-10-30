# Requisitos e roadmap — Aurora Back-End

> **Status:** levantamento inicial; prioridades e regras dependem de validação pela equipe. Nada nesta lista deve ser interpretado como funcionalidade já entregue.

## Objetivo

Oferecer suporte de API à plataforma Web do Aurora para gerenciamento de usuários, mapeamento colaborativo de risco e registros de ocorrências. Integrações Android, SOS em tempo real, círculos e dispositivos serão desenvolvidos em fases posteriores.

## Escopo inicial — Web

| ID | Requisito funcional proposto | Prioridade |
| --- | --- | --- |
| RF-01 | Cadastrar usuário com validação de dados | Alta |
| RF-02 | Autenticar usuário e proteger recursos privados | Alta |
| RF-03 | Consultar e atualizar perfil autorizado | Alta |
| RF-04 | Consultar áreas de risco com filtros geográficos | Alta |
| RF-05 | Registrar e consultar ocorrências | Alta |
| RF-06 | Expor dados geográficos para visualização no mapa | Alta |
| RF-07 | Gerenciar contatos de emergência | Média |
| RF-08 | Moderar ou revisar relatos públicos | A definir |

## Evolução planejada

- Círculos de confiança e convites.
- Acionamento e acompanhamento de SOS.
- Histórico de localização, com consentimento e autorização.
- Notificações e mensageria.
- Integração com dispositivo embarcado e aplicativo Android.

## Requisitos não funcionais

- **Segurança:** senhas com hash apropriado; autenticação, autorização e proteção contra abuso.
- **Privacidade:** limitar acesso a posições, contatos e histórico; definir retenção e consentimento.
- **Confiabilidade:** idempotência e processamento durável em alertas críticos.
- **Qualidade:** TypeScript estrito, testes automatizados e revisão de código.
- **Documentação:** contrato OpenAPI e decisões arquiteturais registradas.
- **Observabilidade:** logs, métricas e rastreabilidade sem exposição de dados sensíveis.
- **Desempenho:** paginação, índices e medições antes de prometer escala.

## Critérios de aceite iniciais (a detalhar)

- Requisições inválidas retornam erros HTTP claros sem expor informações internas.
- Usuários não acessam dados privados de outros usuários sem autorização explícita.
- Registros geográficos validam coordenadas e origem dos dados.
- Cada endpoint entregue possui testes pertinentes e documentação atualizada.

## Questões em aberto

1. A API será compartilhada entre Web e Android?
2. Qual provedor de autenticação será adotado?
3. Quem pode criar, editar, validar e remover áreas de risco?
4. Qual é a política de visibilidade de ocorrências e locais sensíveis?
5. Quais são as garantias e os canais para alertas SOS?
