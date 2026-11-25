# Evidência de validação SQL — PostgreSQL 16

## Ambiente e execução

Execução em contêiner descartável `postgres:16-alpine`, banco novo `ites_coursework`, sem volume persistente nem porta de rede publicada. Os scripts foram montados somente para leitura e executados com `psql -v ON_ERROR_STOP=1` por meio de `database/coursework/run_all.sql`.

Sequência efetiva: `01_schema.sql`, `04_routines.sql`, `02_seed.sql`, `03_queries.sql`, `06_validation.sql`, `05_security.sql` e `07_security_tests.sql`. Todos os passos terminaram com código zero; os blocos de teste confirmaram as negações esperadas. A transcrição integral, com resultados das consultas e mensagens do psql, está em [coursework-validation-postgresql16.txt](coursework-validation-postgresql16.txt). A evidência específica do APD1 — estrutura de cada tabela, dados inseridos e cada consulta seguida do seu resultado — está em [apd1-estrutura-dados-consultas-postgresql16.txt](apd1-estrutura-dados-consultas-postgresql16.txt), gerada por `database/coursework/09_apd1_evidencias.sql` em um banco limpo após o schema, as rotinas e a carga.

## Resultados observados

| Tabela | Linhas após os testes |
|---|---:|
| `users` | 30 |
| `roles` | 20 |
| `permissions` | 20 |
| `user_roles` | 45 |
| `role_permissions` | 61 |
| `organizations` | 20 |
| `demands` | 31 |
| `demand_events` | 29 |
| `pages` | 20 |
| `page_versions` | 21 |
| `page_events` | 22 |
| `grant_audit` | 47 |

O script verificou 49 constraints validadas. As 5 consultas simples, 3 consultas JOIN e 3 subconsultas executaram e retornaram os resultados na transcrição. Todas as 12 tabelas têm pelo menos 20 linhas; o catálogo de papéis e o de permissões têm 20 linhas cada, com valores de negócio descritos na documentação técnica.

As funções foram exercitadas com situação e solicitante existentes/inexistentes. Procedures e triggers foram verificados em condições positivas e negativas: transições válidas, conclusão com nota, ausência de justificativa, transição terminal inválida, auditoria de publicação/retirada, versão de página inválida, histórico imutável e concessão/revogação de papel.

Os testes de segurança confirmaram leitura e inclusão permitidas pelo papel `ites_runtime`, atualização de situação via procedure autorizada, bloqueio de atualização direta de situação, exclusão de histórico, DDL e FK inválida. `ites_reporting` consultou a visão agregada e métricas, mas não leu hash de senha, linhas de demandas ou procedures de escrita. `ites_migration` criou e removeu uma tabela de teste. A conta `ites_database_admin` não foi usada para administrar o banco.

## Limites da evidência

- A carga é demonstrativa, não contém usuários autenticáveis e não deve ser carregada em produção.
- Os testes fazem `SET ROLE` em papéis sem login; não validam senhas de usuários LOGIN. `08_provision_users.sql` é interativo e não foi executado nesta evidência.
- Esta execução valida o schema acadêmico independente. Não prova equivalência com as 35 tabelas operacionais do Flyway nem executa consultas acadêmicas sobre o banco de produção.
- A transcrição inclui saída real; não foram inseridos resultados fabricados.
