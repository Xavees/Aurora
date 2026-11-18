# Testes do Histórico de Localização — 18/11/2026

Branch: test/historico-localizacao, criada a partir de feat/historico-localizacao. Alterações locais anteriores preservadas: bancodeDadosTemp.sql, package.json, src/app.module.ts, scripts/db-dump-update.mjs e implementação não rastreada em src/modules/historico-localizacao. Nenhum commit, push, merge ou rebase realizado.

## Cobertura adicionada

18 testes unitários: 4 de ListarHistoricoLocalizacaoUseCase, 4 de BuscarHistoricoLocalizacaoPorIdUseCase e 10 de TypeOrmHistoricoLocalizacaoRepository. Mocks restritos à camada unitária. Verificam encaminhamento de IDs/filtros/paginação, resultado vazio, NotFoundException, propagação de falhas, mapeamento completo, DECIMAL, SOS, nulos/zero, escopo de usuário e ordenação com desempate.

32 testes e2e: listagem vazia/com registros, ordenação por data, filtros inclusivos e offset de fuso, paginação e página além do fim, contrato individual, BIGINT máximo válido, isolamento bidirecional, JWT ausente/inválido nas duas rotas, parâmetros inválidos e tentativa de informar usuarioId na query.

Os e2e criam dois usuários válidos pela API e obtêm tokens pelo login real. Inserem fixtures determinísticas pelo Repository TypeORM conectado ao MariaDB, sem substituir repositórios ou banco por mocks. Antes de cada caso, removem somente o histórico desses usuários; ao terminar, removem seus usuários e registros. Todas as escritas de fixture/limpeza estão precedidas da verificação SELECT DATABASE() = aurora_test. O helper global existente também exige o banco e usuário de testes. O rate limit segue o override já existente do helper.

O reset existente foi preservado: lê a estrutura de app_aurora e reconstrói apenas aurora_test. Não foram alterados dump, schema, endpoints, dependências ou regras de negócio. Os testes devem ser executados sem outro processo utilizando/resetando aurora_test em paralelo.

## Validação

- npx tsc --noEmit --incremental false: aprovado no Windows e DevContainer. Corrigida durante o desenvolvimento a tipagem de query opcional no novo helper e2e.
- npm run test: 94 testes aprovados em 19 arquivos (inclui 18 novos).
- npm run build: aprovado.
- npm run test:e2e: 95 testes aprovados em 12 arquivos, incluindo os 32 novos, usando o MariaDB real do container pelo endereço publicado no host.

Duas tentativas de e2e pelo Windows falharam no reset com connect ETIMEDOUT, antes dos testes. TCP acessível sozinho não comprovou conexão MariaDB funcional. Execução retomada no DevContainer já existente, conforme documentação do projeto; reset concluído nesse ambiente. Nenhuma credencial foi alterada.

## Limites e sugestões

A garantia real de isolamento está nos e2e; mocks unitários apenas verificam delegação e construção das consultas. Cobertura futura útil: JWT expirado/usuário desativado, combinação de filtros com paginação em grandes conjuntos, todos os campos opcionais nulos via HTTP e mais IDs acima de Number.MAX_SAFE_INTEGER persistidos de fato. Não houve diagnóstico confirmado de defeito de produção nesta entrega; falhas reais que os e2e eventualmente encontrarem não devem ser mascaradas.

## Diagnóstico e reprodução final

A primeira execução no DevContainer identificou erro nas fixtures novas: dois registros com mesmo usuário/data violavam uk_localizacoes_ponto. Corrigidos os horários dos dados fictícios e as expectativas dos intervalos; não removidas asserções. O desempate por ID permanece verificado no unitário, pois a chave única impede esse empate no banco atual. Nenhum defeito de produção foi confirmado.

A execução lenta do DevContainer foi interrompida antes do término; confirmado que não havia processo Vitest restante. A suíte inteira foi então repetida no Windows usando a porta publicada do MESMO container MariaDB, sem editar .env ou scripts:

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3307'
npm run test:e2e
```

Esses overrides foram limitados ao processo de validação. Para outro ambiente, usar o endereço real configurado nele, sem copiar credenciais. O resultado final foi 95/95 e2e; as tentativas anteriores e sua causa estão registradas acima. Todos os testes existentes passaram junto dos novos: 76 unitários anteriores + 18 novos = 94; 63 e2e anteriores + 32 novos = 95.

Arquivos adicionados nesta entrega:
- src/modules/historico-localizacao/application/use-cases/listar-historico-localizacao.use-case.spec.ts
- src/modules/historico-localizacao/application/use-cases/buscar-historico-localizacao-por-id.use-case.spec.ts
- src/modules/historico-localizacao/infrastructure/persistence/typeorm/repositories/typeorm-historico-localizacao.repository.spec.ts
- test/historico-localizacao/historico-localizacao.e2e-spec.ts
- docs/TESTES_HISTORICO_LOCALIZACAO.md