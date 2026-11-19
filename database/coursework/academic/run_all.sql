-- Orquestra a atividade acadêmica completa em um banco vazio e isolado.
-- Execute a partir de database/coursework/run_all.sql com psql.
\set ON_ERROR_STOP on

\echo 'Etapa 1/7: criar tabelas, relações e restrições'
\ir 01_schema.sql

\echo 'Etapa 2/7: criar funções, procedimentos e gatilhos acadêmicos'
\ir 04_routines.sql

\echo 'Etapa 3/7: inserir dados fictícios determinísticos'
\ir 02_seed.sql

\echo 'Etapa 4/7: executar consultas demonstrativas'
\ir 03_queries.sql

\echo 'Etapa 5/7: validar integridade e automações'
\ir 06_validation.sql

\echo 'Etapa 6/7: criar papéis e atribuir privilégios'
\ir 05_security.sql

\echo 'Etapa 7/7: testar acessos permitidos e negados'
\ir 07_security_tests.sql
