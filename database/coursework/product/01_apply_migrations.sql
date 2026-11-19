-- Aplica a estrutura operacional sem copiar as definições das migrações Flyway.
-- Execute somente em banco PostgreSQL vazio, descartável e isolado.
-- Cada arquivo é confirmado em sua própria transação para respeitar ON COMMIT DROP.
\set ON_ERROR_STOP on
\set AUTOCOMMIT off
\echo 'Aplicando as migrações oficiais do produto em banco de estudo isolado.'
\echo 'A ordem e o conteúdo abaixo são os mesmos usados pelo Flyway.'

\ir ../../../server/src/main/resources/db/migration/V1__baseline.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V2__account_security.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V3__project_themes.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V4__project_route_blueprint.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V5__publications.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V6__publication_analytics.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V7__form_submissions.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V8__form_submission_schema.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V9__organizations_and_tenant_resources.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V10__organization_permission_grants.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V11__organization_membership_administration.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V12__explicit_submission_export_grants.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V13__organization_feature_availability.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V14__organization_page_templates.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V15__retain_page_template_snapshots_after_author_removal.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V16__project_revision_history_and_publication_links.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V17__publication_review_approvals.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V18__tenant_form_versions.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V19__tenant_consistent_resource_associations.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V20__tenant_consistent_form_submissions.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V21__tenant_scoped_audit_events.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V22__immutable_form_version_names.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V23__ites_domain.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V24__administrator_permission_sync.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V25__analytics_permissions.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V26__demand_dashboard_page.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V27__root_project.sql
COMMIT;
\ir ../../../server/src/main/resources/db/migration/V28__root_page_navigation.sql
COMMIT;
\set AUTOCOMMIT on

\echo 'Migrações oficiais aplicadas.'
