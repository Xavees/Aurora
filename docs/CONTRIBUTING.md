# Guia de colaboração — Aurora Back-End

Este documento organiza a colaboração da equipe 01.

## Fluxo de trabalho 

1. Abra ou vincule uma tarefa descrevendo problema, objetivo e critérios de aceite.
2. Crie uma branch a partir da branch principal atualizada: `feat/usuarios-cadastro`, `fix/validacao-email`, `docs/arquitetura`.
3. Faça alterações pequenas e relacionadas a uma única finalidade.
4. Execute as verificações disponíveis: `npm run build`, `npm run lint` e `npm run test`.
5. Abra um Pull Request explicando alterações, testes realizados e eventuais impactos no banco.
6. Solicite revisão de outro integrante antes do merge, quando possível.

## Convenção de commits

- `feat: adiciona cadastro de usuario`
- `fix: corrige validacao de email`
- `docs: detalha arquitetura de eventos`
- `test: cobre regras de ocorrencia`
- `refactor: separa acesso a persistencia`

## Padrões técnicos

- TypeScript com `strict: true`, ESM e imports relativos com extensão `.js`.
- NestJS com módulos organizados por responsabilidade.
- Controllers enxutos; regras de negócio em services ou casos de uso.
- DTOs validados; nunca retornar hashes de senha.
- Não adicionar abstrações, padrões ou dependências sem necessidade justificada.
- Alterações no esquema exigem revisão e plano de migração; `synchronize: false`.
- Atualizar documentação e testes ao modificar comportamento.

## Segurança

Não publicar `.env`, tokens, chaves, dados pessoais, posições GPS reais ou dumps de produção. Em caso de vulnerabilidade, comunicar a equipe por canal privado; não divulgar detalhes exploráveis em issues públicas.

## Checklist do Pull Request

- [ ] Mudança ligada a tarefa/requisito
- [ ] Build e lint executados
- [ ] Testes adicionados/atualizados quando cabível
- [ ] Sem segredos ou dados pessoais
- [ ] Impacto em banco/API documentado
- [ ] README/docs atualizados quando necessário
