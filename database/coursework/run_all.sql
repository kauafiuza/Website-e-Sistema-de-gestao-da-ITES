\set ON_ERROR_STOP on
\echo 'Etapa 1: criação do modelo relacional'
\ir 01_schema.sql
\echo 'Etapa 2: criação de rotinas e gatilhos'
\ir 04_routines.sql
\echo 'Etapa 3: carga de dados fictícios'
\ir 02_seed.sql
\echo 'Etapa 4: consultas de negócio'
\ir 03_queries.sql
\echo 'Etapa 5: validação de dados e automações'
\ir 06_validation.sql
\echo 'Etapa 6: configuração de papéis e privilégios'
\ir 05_security.sql
\echo 'Etapa 7: testes de autorização e integridade'
\ir 07_security_tests.sql
