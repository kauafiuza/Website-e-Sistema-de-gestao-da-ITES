-- Cria e verifica o schema operacional em um banco PostgreSQL descartável.
-- A carga de dados de negócio permanece sob responsabilidade do backend.
\set ON_ERROR_STOP on

\echo 'Etapa 1/3: aplicar as migrações oficiais do produto'
\ir 01_apply_migrations.sql

\echo 'Etapa 2/3: validar estrutura, grants e gatilhos'
\ir 02_validate_schema.sql

\echo 'Etapa 3/3: executar consultas de referência'
\ir 03_queries.sql
