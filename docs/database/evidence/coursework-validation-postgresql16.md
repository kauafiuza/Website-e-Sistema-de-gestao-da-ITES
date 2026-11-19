# Evidência de validação SQL — PostgreSQL 16

## Ambiente e execução

Execução em contêiner descartável `postgres:16-alpine`, banco novo `ites_coursework`, sem volume persistente nem porta de rede publicada. Os scripts foram montados somente para leitura e executados com `psql -v ON_ERROR_STOP=1` por meio de `database/coursework/run_all.sql`.

Sequência efetiva: `academic/01_schema.sql`, `academic/04_routines.sql`, `academic/02_seed.sql`, `academic/03_queries.sql`, `academic/06_validation.sql`, `academic/05_security.sql` e `academic/07_security_tests.sql`, orquestrados pelo ponto de entrada `run_all.sql`. Após a reorganização, o fluxo completo foi executado novamente em banco vazio PostgreSQL 16; todos os passos terminaram com código zero e os testes confirmaram as negações esperadas. A transcrição atualizada está em [coursework-validation-postgresql16.txt](coursework-validation-postgresql16.txt).

## Resultados observados

| Tabela | Linhas após os testes |
|---|---:|
| `users` | 30 |
| `roles` | 4 |
| `permissions` | 13 |
| `user_roles` | 45 |
| `role_permissions` | 22 |
| `organizations` | 20 |
| `demands` | 31 |
| `demand_events` | 29 |
| `pages` | 20 |
| `page_versions` | 21 |
| `page_events` | 22 |
| `grant_audit` | 47 |

O script verificou 49 constraints validadas. As 5 consultas simples, 3 consultas JOIN e 3 subconsultas executaram e retornaram os resultados na transcrição. O catálogo de papéis e permissões ficou em 4 e 13 linhas, respectivamente, preservando valores de negócio significativos; a exceção ao limite acadêmico de 20 por tabela está descrita na documentação técnica e aguarda aceite do orientador.

As funções foram exercitadas com situação e solicitante existentes/inexistentes. Procedures e triggers foram verificados em condições positivas e negativas: transições válidas, conclusão com nota, ausência de justificativa, transição terminal inválida, auditoria de publicação/retirada, versão de página inválida, histórico imutável e concessão/revogação de papel.

Os testes de segurança confirmaram leitura e inclusão permitidas pelo papel `ites_runtime`, atualização de situação via procedure autorizada, bloqueio de atualização direta de situação, exclusão de histórico, DDL e FK inválida. `ites_reporting` consultou a visão agregada e métricas, mas não leu hash de senha, linhas de demandas ou procedures de escrita. `ites_migration` criou e removeu uma tabela de teste. A conta `ites_database_admin` não foi usada para administrar o banco.

## Limites da evidência

- A carga é demonstrativa, não contém usuários autenticáveis e não deve ser carregada em produção.
- Os testes fazem `SET ROLE` em papéis sem login; não validam senhas de usuários LOGIN. `academic/08_provision_users.sql` é interativo e não foi executado nesta evidência.
- Esta execução valida o schema acadêmico independente. Não prova equivalência com as 35 tabelas operacionais do Flyway nem executa consultas acadêmicas sobre o banco de produção.
- A transcrição inclui saída real; não foram inseridos resultados fabricados.
