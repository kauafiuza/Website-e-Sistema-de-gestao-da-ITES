-- Executa o percurso do schema operacional em um banco descartável.
-- As migrações incluídas continuam sendo as fontes oficiais do Flyway.
\set ON_ERROR_STOP on
\ir product/run_all.sql
