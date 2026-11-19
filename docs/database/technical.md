# Documentação técnica do banco de dados

## Contexto e aprovação

A ITES, incubadora associada ao IFRJ Campus Niterói, recebe solicitações de grupos e organizações de economia solidária, acompanha decisões e publica informação institucional. A base relacional preserva pessoas, organizações, demandas, papéis, páginas publicadas e trilhas de auditoria.

A proposta do banco foi validada pelo responsável do projeto nesta conversa. `database/coursework/academic/` contém o modelo acadêmico de 12 tabelas; `database/coursework/product/` oferece acesso de estudo às migrações oficiais do produto. O segundo percurso não copia definições nem substitui o Flyway: sua lista de inclusões aponta diretamente para `server/src/main/resources/db/migration/` e atualmente chega à V28. Os comandos de entrada preservados na raiz são `run_all.sql` e `run_product.sql`.

O SGBD é PostgreSQL, compatível com a infraestrutura do produto. A validação documentada aqui foi executada em PostgreSQL 16. O PDF original de requisitos e o template institucional não foram encontrados; os requisitos reproduzidos no pedido do projeto são a referência utilizada.

## Acesso ao schema operacional

O schema operacional contém 35 tabelas da aplicação. A lista e as relações evoluem nas migrações Flyway, que são a fonte única das definições. Para inspecionar essas estruturas sem conectar a aplicação a um banco sem histórico Flyway, siga [database/coursework/README.md](../../database/coursework/README.md) e execute `run_product.sql` em uma instância PostgreSQL descartável.

O carregamento foi organizado em uma transação por arquivo, como no comportamento padrão do Flyway. Isso é necessário para migrações que usam tabelas temporárias com `ON COMMIT DROP`. A validação verifica as 35 tabelas, as 17 permissões atuais, sua associação ao papel `ADMINISTRATOR`, as quatro declarações de gatilho, a restrição de unicidade do projeto `ROOT` e as páginas institucionais iniciais. As consultas sobre o schema operacional estão em `database/coursework/product/03_queries.sql`.

Esse banco de estudo não contém `flyway_schema_history` e não deve ser usado como banco de execução da aplicação. Para a aplicação real, o backend executa o Flyway e registra as migrações. A instância recém-migrada não tem dados de negócio: o provisionador cria a página inicial publicada e o projeto raiz depois que existem administrador e organização padrão.

## Modelo lógico acadêmico

O modelo acadêmico contém 12 tabelas. `users` e `organizations` se relacionam com demandas e páginas; papéis e permissões formam relações N:N por tabelas de associação; eventos preservam decisões, concessões e publicações. [Abrir o diagrama lógico acadêmico em SVG](logical-model.svg). Ele permanece como material da atividade acadêmica e não deve ser interpretado como o diagrama completo das 35 tabelas operacionais.

Relacionamentos e cardinalidades:

- `users` 1:N `demands` como solicitante; `organizations` 1:N `demands`, associação opcional por demanda.
- `demands` 1:N `demand_events`; `users` 1:N `demand_events` como responsável.
- `users` N:N `roles` por `user_roles`; `roles` N:N `permissions` por `role_permissions`.
- `pages` 1:N `page_versions`; `users` 1:N `page_versions` como autor. Uma página aponta para no máximo uma versão publicada, pertencente à própria página.
- `pages` 1:N `page_events`; versões e usuários podem aparecer em vários eventos de publicação.
- `users` relaciona-se com `grant_audit` pelos papéis de ator e pessoa que recebeu/perdeu a concessão; `roles` 1:N `grant_audit`.

## Modelo físico e dicionário de dados

Tipos abaixo são PostgreSQL. Campos sem indicação de nulabilidade são `NOT NULL`; datas usam `timestamptz` e padrão `now()` quando indicado.

| Tabela | Colunas, tipos e restrições |
|---|---|
| `users` | `id bigint` identity, PK; `name text`; `email text` UNIQUE; `password_hash text`; `whatsapp text` NULL; `active boolean` DEFAULT `true`; `created_at timestamptz` DEFAULT `now()`. |
| `roles` | `id bigint` identity, PK; `code text` UNIQUE; `name text`. |
| `permissions` | `id bigint` identity, PK; `code text` UNIQUE; `description text`. |
| `user_roles` | `user_id bigint` FK `users(id)` ON DELETE CASCADE; `role_id bigint` FK `roles(id)` ON DELETE CASCADE; PK composta (`user_id`,`role_id`). |
| `role_permissions` | `role_id bigint` FK `roles(id)` ON DELETE CASCADE; `permission_id bigint` FK `permissions(id)` ON DELETE CASCADE; PK composta (`role_id`,`permission_id`). |
| `organizations` | `id bigint` identity, PK; `name text`; `economic_sector text`; `contact_email text` NULL; `created_at timestamptz` DEFAULT `now()`. O setor econômico não representa o serviço solicitado. |
| `demands` | `id bigint` identity, PK; `code text` GENERATED STORED UNIQUE; `requester_id bigint` FK `users`; `organization_id bigint` FK `organizations` NULL; `capacity text`; `capacity_other text` NULL; `service text`; `description text`; `urgency text`; `status text` DEFAULT `Pendente`; `completion_note text` NULL; `review_notes text` NULL; `created_at`, `updated_at timestamptz` DEFAULT `now()`. CHECKs restringem condição, urgência, situação, descrição mínima, descrição de `OTHER` e nota de conclusão. Índices cobrem solicitante/data, situação/data e organização/situação. |
| `demand_events` | `id bigint` identity, PK; `demand_id bigint` FK `demands`; `actor_id bigint` FK `users`; `old_status`, `new_status`, `justification text`; `occurred_at timestamptz` DEFAULT `now()`. CHECKs restringem estados possíveis e exigem justificativa; índices cobrem demanda/data e ator/data. |
| `pages` | `id bigint` identity, PK; `slug text` UNIQUE; `title text`; `published_version_id bigint` NULL; `created_at timestamptz` DEFAULT `now()`. FK composta (`id`,`published_version_id`) aponta para versão da mesma página. |
| `page_versions` | `id bigint` identity, PK; `page_id bigint` FK `pages` ON DELETE CASCADE; `revision integer` CHECK maior que zero; `document jsonb` CHECK objeto; `author_id bigint` FK `users`; `created_at timestamptz` DEFAULT `now()`; UNIQUE (`page_id`,`revision`) e UNIQUE (`page_id`,`id`). |
| `page_events` | `id bigint` identity, PK; `page_id bigint` FK `pages`; `version_id bigint` NULL; `actor_id bigint` FK `users`; `action text` CHECK `PUBLISH` ou `UNPUBLISH`; `occurred_at timestamptz` DEFAULT `now()`. FK composta (`page_id`,`version_id`) impede associar versão de outra página. Índice cobre página/data. |
| `grant_audit` | `id bigint` identity, PK; `actor_id`, `subject_user_id bigint` FK `users`; `role_id bigint` FK `roles`; `action text` CHECK `GRANT` ou `REVOKE`; `occurred_at timestamptz` DEFAULT `now()`. Índice cobre pessoa/data. |

Os tipos e identificadores acadêmicos, como `bigint` e `pages`, não correspondem necessariamente aos tipos e nomes operacionais, que usam UUIDs e também incluem `projects`, publicações, sessões, organizações, formulários e páginas institucionais.

## Instalação e carga de demonstração

`database/coursework/run_all.sql` é o caminho reproduzível do modelo acadêmico em um banco vazio e dedicado. Ele executa schema, rotinas, dados, consultas, validações funcionais, privilégios e testes de segurança. A instalação usa PostgreSQL 16 e psql:

```sh
docker run -d --name ites-db-academico \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?Defina uma senha local no ambiente}" \
  -v "$PWD/database/coursework:/coursework:ro" \
  -p 127.0.0.1:55432:5432 postgres:16-alpine
docker exec ites-db-academico createdb -U postgres ites_coursework
until docker exec ites-db-academico pg_isready -U postgres; do sleep 1; done
docker exec ites-db-academico psql -v ON_ERROR_STOP=1 \
  -U postgres -d ites_coursework -f /coursework/run_all.sql
docker rm -f ites-db-academico
```

O comando `pg_isready` pode imprimir tentativas recusadas até o serviço iniciar. A saída real da execução está em [evidence/coursework-validation-postgresql16.txt](evidence/coursework-validation-postgresql16.txt). O arquivo de carga usa somente identidades `example.invalid` e hashes sentinela não autenticáveis. Para executar as migrações operacionais em banco separado, use os comandos do README desta pasta.

As tabelas de negócio e associação contêm ao menos 20 linhas. Os catálogos têm 4 papéis (`REQUESTER`, `ADMINISTRATOR`, `DEMAND_MANAGER`, `COLLABORATOR`) e 13 permissões com significado funcional. Não foram inventados papéis/permissões artificiais para alcançar 20 linhas: essa exceção semântica ao requisito acadêmico de contagem está registrada e requer aceite do orientador.

## Consultas SQL — ADP1

As 11 consultas acadêmicas estão em `database/coursework/academic/03_queries.sql`. Cada comando tem uso operacional:

### Cinco consultas simples

1. Demandas pendentes ordenadas pela criação: fila de trabalho atual.
2. Demandas de alta urgência: priorização de atendimento.
3. Organizações do setor de artesanato: recorte por setor econômico.
4. Demandas em intervalo temporal: acompanhamento por período.
5. Páginas publicadas: inventário do conteúdo público.

### Três consultas com JOIN

1. Total de demandas por organização e situação: volume e andamento por grupo.
2. Decisões por responsável: distribuição das análises entre administradores.
3. Demandas por setor econômico e serviço: diferencia o setor da organização da assistência solicitada.

### Três subconsultas

1. `EXISTS`: organizações que têm ao menos uma demanda aceita.
2. Subconsulta escalar com média: solicitantes cujo número de demandas supera a média entre solicitantes ativos.
3. `IN` aninhado: solicitantes com demanda urgente associada a organização de artesanato.

As três categorias de consultas são executadas pelo percurso acadêmico `run_all.sql`; seus resultados constam na evidência PostgreSQL 16. O arquivo `product/03_queries.sql` fornece as mesmas categorias com os nomes e relacionamentos do schema operacional. O ponto de entrada `run_product.sql` aplica as migrações, executa a validação e roda as consultas.

## Rotinas e automações — ADP2

As rotinas acadêmicas estão em `database/coursework/academic/04_routines.sql`. No schema operacional, as regras executadas por gatilhos estão nas migrações oficiais e não são redefinidas por esse arquivo.

### Funções

| Função | Entrada e saída | Propósito |
|---|---|---|
| `demand_count(text)` | Situação; retorna `bigint` | Conta demandas na situação informada; leitura estável para indicadores. |
| `requester_demand_count(bigint)` | ID do solicitante; retorna `bigint` | Conta as demandas da pessoa indicada; retorna zero para ID sem registros. |
| `published_page_count()` | Sem entrada; retorna `bigint` | Conta páginas com uma versão publicada. |

As funções executam consultas agregadas sem modificar dados. Os testes verificam situação existente e inexistente, solicitante com/sem demandas e contagem antes/depois de retirada de página.

### Procedimentos

| Procedimento | Entradas | Comportamento e atomicidade |
|---|---|---|
| `transition_demand` | Demanda, ator, situação, justificativa e nota opcional | Bloqueia a demanda, atualiza a situação e registra evento na mesma transação. O gatilho e CHECKs validam a transição e a conclusão. |
| `publish_page` | Página, versão, ator | Confirma que a versão pertence à página e publica; o gatilho grava a auditoria na mesma transação. |
| `unpublish_page` | Página, ator | Remove a referência publicada; o gatilho registra a retirada preservando a versão histórica. |
| `assign_role` | Usuário, papel, ator | Concede papel; evento de auditoria é inserido somente se a associação foi criada. |
| `revoke_role` | Usuário, papel, ator | Revoga papel e audita somente se havia associação. |

Os procedimentos de escrita usam `SECURITY DEFINER` com `search_path` fixo. Em PostgreSQL, cada `CALL` é transacional: falha em validação, FK ou trigger desfaz também o registro correspondente de auditoria. Os testes exercitam fluxos válidos e inválidos.

### Gatilhos do modelo acadêmico

| Gatilho | Tabela e evento | Regra |
|---|---|---|
| `transition_guard` | `demands`, antes de atualizar situação | Restringe transições permitidas e atualiza `updated_at`. |
| `event_immutable` | `demand_events`, antes de UPDATE/DELETE | Impede adulterar o histórico de decisão. |
| `page_publish_audit` | `pages`, após alterar versão publicada | Exige ator transacional e registra publicação ou retirada. |

### Gatilhos operacionais

No schema operacional, as migrações instalam quatro gatilhos: sincronização de novas permissões com o papel `ADMINISTRATOR`; validação de transições em `demands`; bloqueio de `UPDATE`/`DELETE` e de `TRUNCATE` em `organization_audit_events`. A V24 também sincroniza as permissões existentes; cada nova linha inserida em `app_permissions` é associada ao papel administrativo na mesma transação. A validação de transição não grava sozinha uma linha em `demand_events`; o serviço da aplicação atualiza a demanda e registra o evento na mesma transação.

## Administração, permissões e integridade — ADP3

O script `database/coursework/academic/05_security.sql` cria papéis de grupo sem login:

- `ites_runtime`: leitura e escrita operacional; não pode mudar situação diretamente, excluir histórico, administrar schema ou conceder privilégios.
- `ites_reporting`: leitura de uma visão agregada e de funções de métricas; não lê credenciais nem linhas detalhadas de demandas.
- `ites_migration`: privilégios de alteração de schema para execução controlada de migrações.
- `ites_database_admin`: administração dos objetos acadêmicos; não deve ser concedido à aplicação.

O arquivo `database/coursework/academic/08_provision_users.sql` cria contas LOGIN associadas aos quatro grupos com `\password`, que solicita senha sem registrá-la no repositório. Esse provisionamento foi executado interativamente em banco temporário com credenciais descartáveis; os quatro logins autenticaram e seus acessos foram testados. O banco do produto ainda usa a mesma conta para Flyway e runtime; a separação descrita aqui é do modelo acadêmico e continua pendente de aplicação à infraestrutura integrada.

Aplicação, permissões de negócio e papéis do PostgreSQL são camadas diferentes. As permissões da aplicação determinam quem pode decidir demandas; as roles do banco limitam o que uma conexão técnica consegue fazer. Os scripts negam acesso PUBLIC, usam privilégios por coluna/tabela, restringem funções/procedimentos e disponibilizam relatórios somente por agregação. As verificações executam `SET ROLE` para testar acesso autorizado e negações de escrita, leitura sensível, DDL e integridade referencial.

## Evidências, limites e próximos passos

A validação acadêmica limpa em `postgres:16-alpine` executou criação, carga, as 11 consultas, funções, procedimentos, gatilhos, privilégios, testes positivos/negativos e contagens. As evidências estão na [transcrição acadêmica](evidence/coursework-validation-postgresql16.txt) e na [validação das contas LOGIN](evidence/database-users-validation-postgresql16.txt). A execução adicional do percurso `database/coursework/run_product.sql` contra PostgreSQL 16 está registrada em [evidence/product-schema-validation-postgresql16.md](evidence/product-schema-validation-postgresql16.md), com saída integral em TXT.

Pendências documentadas:

- O número de papéis e permissões é menor que 20 por razões semânticas; falta aprovação acadêmica dessa exceção.
- O diagrama lógico exportado continua descrevendo o modelo acadêmico de 12 tabelas; o schema operacional possui 35 tabelas e deve ser consultado pelas migrações Flyway ou pelo percurso isolado `run_product.sql`.
- As contas LOGIN foram exercitadas somente em banco descartável, com senhas temporárias que não foram preservadas; isso não valida a gestão de segredos de produção.
- O modelo lógico nesta pasta representa o schema acadêmico; falta diagrama abrangente e sincronizado do schema real do produto.
- O runtime da aplicação ainda precisa ser separado da identidade proprietária usada pelas migrações.
- Não há evidência de implantação Dokploy/VPS.
