# Desativação transacional de usuários

## Objetivo

Documentar a desativação coordenada de contas no **Aurora Backend**, preservando a consistência dos círculos de segurança quando um usuário deixa a plataforma.

A operação utiliza **soft delete** para a conta e executa, na mesma transação de banco de dados, a revisão das participações do usuário, a sucessão administrativa quando necessária e a remoção dos seus vínculos com os círculos.

## Escopo e regras de negócio

Ao desativar uma conta ativa:

1. O backend identifica os círculos dos quais ela participa, inclusive círculos já desativados.
2. Se um círculo ativo possui outros participantes ativos e **já existe outro administrador ativo**, a administração existente é preservada.
3. Se um círculo ativo possui outros participantes ativos, mas **não possui administrador ativo após a saída**, o participante ativo mais antigo é promovido a `ADMINISTRADOR`.
4. Se um círculo ativo **não possui outros participantes ativos**, o próprio círculo recebe soft delete.
5. Todas as participações da conta são removidas, inclusive as relativas a círculos desativados.
6. A conta recebe soft delete (`excluido_em`).

A escolha do sucessor é delegada ao serviço de domínio `selecionarSucessorCirculo`, com critérios de desempate testados separadamente. Participantes desativados não são elegíveis.

### Exemplo

| Situação antes da desativação | Comportamento esperado |
| --- | --- |
| Administrador A e membro ativo B | B assume a administração quando A é desativado |
| Apenas A no círculo | Círculo é desativado |
| A e outro administrador ativo B | B permanece administrador |
| A participa de vários círculos | Cada círculo recebe o tratamento correspondente na mesma transação |

## Arquitetura

A camada HTTP permanece desacoplada dos detalhes de persistência:

```text
DELETE /usuarios/:id
  → autenticação e autorização HTTP
  → DesativarUsuarioUseCase
  → DesativarUsuarioTransacionalRepository (contrato)
  → TypeOrmDesativarUsuarioTransacionalRepository
  → transação no MariaDB
```

### Principais arquivos

- `src/modules/usuarios/application/use-cases/desativar-usuario.use-case.ts`: coordena o caso de uso e traduz a ausência de uma conta ativa em `NotFoundException`.
- `src/modules/usuarios/domain/repositories/desativar-usuario-transacional.repository.ts`: contrato `desativar(id): Promise<boolean>`.
- `src/modules/usuarios/domain/repositories/desativar-usuario-transacional.repository.token.ts`: token de injeção de dependência.
- `src/modules/usuarios/infrastructure/persistence/typeorm/repositories/typeorm-desativar-usuario-transacional.repository.ts`: implementação com TypeORM e transação.
- `src/modules/circulos/domain/services/selecionar-sucessor-circulo.ts`: regra pura de sucessão administrativa.
- `UsuariosPersistenceModule`: registra e exporta a implementação transacional, mantendo o repositório convencional de usuários para as demais operações.

## Fluxo de persistência

A implementação usa uma transação com nível de isolamento **`READ COMMITTED`**:

1. Lê inicialmente as participações da conta e os membros dos círculos encontrados.
2. Ordena os IDs dos usuários de forma numérica (`BigInt`) e adquire bloqueios pessimistas de escrita (`FOR UPDATE`) em ordem crescente.
3. Verifica se a conta-alvo ainda está ativa.
4. Bloqueia os círculos encontrados em ordem crescente de ID, depois dos bloqueios de usuário.
5. Relê participações e membros; compara os círculos, as contas envolvidas e os dados relevantes dos membros (IDs, círculo, usuário, função e data de entrada).
6. Se a composição lida mudou, cancela a tentativa por meio de uma exceção interna, causando rollback.
7. Aplica as regras de sucessão ou desativação de cada círculo ativo.
8. Remove os vínculos do usuário e realiza o soft delete da conta.
9. Confirma a transação apenas quando todas as operações foram concluídas.

A implementação realiza até **três tentativas** em caso de detecção de alterações de participações ou deadlock (`ER_LOCK_DEADLOCK` / erro MariaDB `1213`). Outros erros são propagados.

### Atomicidade e rollback

As modificações ocorrem na **mesma transação**: se uma etapa falhar antes do commit, as alterações realizadas naquela tentativa são revertidas. Isso evita, por exemplo, concluir a desativação da conta sem efetivar a sucessão administrativa correspondente.

O retorno do repositório é:

- `true`: desativação concluída;
- `false`: usuário inexistente ou já desativado.

O caso de uso converte `false` em `404 Not Found` com a mensagem `Usuário ativo não encontrado.`. Uma desativação bem-sucedida mantém a resposta HTTP `204 No Content`. A autenticação deve recusar o JWT da conta desativada em solicitações posteriores.

## Coordenação entre operações de círculos

As operações transacionais dos círculos foram ajustadas para priorizar bloqueios de **contas antes dos bloqueios de círculos**, incluindo entrada, saída e mudanças administrativas conforme a necessidade de cada operação. Essa convenção reduz conflitos de aquisição de bloqueios e permite que a desativação revalide as informações antes de persistir mudanças.

A entrada em círculo, por exemplo, bloqueia a conta que está entrando, verifica se ela continua ativa, bloqueia o círculo e só então cria a participação. A restrição `UNIQUE` no banco permanece como proteção contra entradas duplicadas.

## Testes e evidências

A implementação foi validada com testes unitários e testes de integração/e2e com MariaDB, incluindo:

- Desativação de conta sem círculos.
- Sucessão do administrador para outro participante ativo.
- Desativação de círculo sem participantes ativos restantes.
- Repetição da desativação para conta já desativada.
- Rollback quando ocorre falha durante a transação.
- Fluxo HTTP `DELETE /usuarios/:id` com JWT, resposta `204`, soft delete e invalidação posterior do token.
- Rejeição de tentativa de desativar a conta de outro usuário (`403`).
- Tratamento de múltiplos círculos com regras administrativas distintas em uma única desativação.
- Desativações concorrentes, entrada/saída de membros e promoção/rebaixamento administrativo concorrentes.
- Entrada de um novo participante durante bloqueio temporário da conta do administrador.

Os arquivos de referência incluem:

```text
src/modules/usuarios/application/use-cases/desativar-usuario.use-case.spec.ts
test/circulos/desativacao-usuario.e2e-spec.ts
test/circulos/desativacao-usuario-concorrencia.e2e-spec.ts
test/circulos/transacoes.e2e-spec.ts
```

### Execução local

```bash
npx tsc --noEmit --incremental false
npm run lint
npm test
npm run test:e2e
npm run build
```

O comando `npm run test:e2e` atualiza a estrutura do banco de testes por meio de `db:test:reset` antes de executar o Vitest. **Nunca execute os testes contra o banco de desenvolvimento ou produção.**

### CI

O workflow `.github/workflows/backend.yml` utiliza Node.js 24, MariaDB 10.4.32, instalação via `npm ci`, build, lint, checagem TypeScript e testes unitários. Depois importa o dump `bancodeDadosTemp.sql`, valida a estrutura de `aurora_test` e executa `npm run test:e2e:ci`, que usa o esquema preparado pelo próprio workflow, sem repetir o reset local.

A configuração foi revisada localmente; **o resultado de uma execução específica do GitHub Actions deve ser conferido após o push**.

## Limitações e cuidados

- **Testes de concorrência não são prova formal de ausência de corridas.** Execuções repetidas com `Promise.all()` verificam interleavings observados, mas não garantem todas as ordens possíveis.
- A descoberta inicial de participantes ocorre antes da aquisição de todos os bloqueios. A revalidação detecta alterações observáveis nos registros e dados comparados, mas não elimina, por si só, todas as situações possíveis de mudança concorrente.
- Alterações que ocorram e sejam revertidas entre as leituras podem não ser reconhecidas pela comparação de assinaturas.
- É importante que futuras operações capazes de modificar participações ou permissões mantenham o protocolo de bloqueio e sejam cobertas por testes de concorrência.
- A ausência de administradores ativos em um círculo ativo é tratada pela sucessão quando existem participantes ativos; revisões futuras devem manter esse invariante.
- Soft delete **não equivale a anonimização ou exclusão física de todos os dados pessoais**. Qualquer obrigação adicional de retenção, anonimização ou remoção deve ser tratada em política própria.

## Histórico da alteração

Esta implementação substitui a desativação simples por um fluxo transacional que coordena conta, participações, administração e ciclo de vida dos círculos. O endpoint público não precisa de mudança de rota ou de contrato HTTP para adotar o novo comportamento.
