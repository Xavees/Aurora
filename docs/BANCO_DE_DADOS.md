# Banco de dados — Aurora

## Referência

O arquivo SQL fornecido pela equipe 01 define o banco `app_aurora`, compatível conforme seu cabeçalho com MySQL 8.0+ / MariaDB 10.3+. A configuração inicial da API usa MySQL com `mysql2` e TypeORM.

## Tabelas do script atual

| Tabela | Finalidade |
| --- | --- |
| `usuario` | Dados de perfil e credenciais |
| `contato_de_emergencia` | Contatos vinculados a usuários |
| `circulo` | Grupos privados |
| `membro_do_circulo` | Relação usuário–círculo |
| `dispositivo_embarcado` | Dispositivos ESP32/GPS |
| `alerta_sos` | Disparos de emergência |
| `notifica` | Associação SOS–círculos |
| `area_de_risco` | Zonas de risco no mapa |
| `ocorrencia` | Relatos georreferenciados |
| `historico_localizacao` | Histórico GPS/telemetria |
| `mensagem` | Texto, áudio e imagens |

## Conexão local

Exemplo de `.env` (nunca versionar credenciais reais):

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=defina_localmente
DB_DATABASE=app_aurora
```

No TypeORM, usar `synchronize: false` para impedir sincronização automática destrutiva. As entidades devem refletir tipos, chaves e nomes **reais** do SQL. Evoluções devem ser versionadas em migrations.

## Pontos a revisar antes das entidades

1. O script inicia com `DROP DATABASE IF EXISTS app_aurora`: **apaga o banco existente**. Nunca executar indiscriminadamente.
2. `usuario.firebase_uid` indica possível integração Firebase; definir estratégia de autenticação.
3. `area_de_risco.raio_metros DECIMAL(11,8)` comporta apenas 3 dígitos inteiros; revisar alcance e precisão desejados.
4. `mensagem.fk_contato_id_contato` aponta para contatos de emergência, que não necessariamente possuem contas de usuário; esclarecer mensagens diretas.
5. Validar limites de latitude/longitude, consentimento, retenção e acesso a dados de localização.
6. Definir regras de exclusão: o SQL contém `ON DELETE CASCADE` para dados que podem exigir histórico ou auditoria.
7. Revisar `UNIQUE(fk_usuario_id_usuario, data_hora_gps)` para casos de múltiplos dispositivos no mesmo instante.

## Política de migrações

- Não executar scripts destrutivos sem backup e revisão.
- Não usar `synchronize: true` em bancos compartilhados ou produção.
- Criar e revisar migrations para cada alteração do esquema.
- Testar migrações e reversões em ambiente descartável.
- Nunca adicionar dados pessoais reais a fixtures ou repositório.
