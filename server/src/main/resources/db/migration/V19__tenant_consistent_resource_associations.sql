-- Permite que as FKs abaixo validem o projeto associado, além do UUID global.
ALTER TABLE project_revisions
    ADD CONSTRAINT uq_project_revisions_project_id UNIQUE (project_id, id);

ALTER TABLE publications
    ADD CONSTRAINT uq_publications_id_project UNIQUE (id, project_id);

ALTER TABLE publication_versions
    ADD COLUMN project_id uuid;

UPDATE publication_versions version
SET project_id = publication.project_id
FROM publications publication
WHERE publication.id = version.publication_id;

ALTER TABLE publication_versions
    ALTER COLUMN project_id SET NOT NULL,
    ADD CONSTRAINT fk_publication_version_publication_project
        FOREIGN KEY (publication_id, project_id)
        REFERENCES publications (id, project_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_publication_version_revision_project
        FOREIGN KEY (project_id, project_revision_id)
        REFERENCES project_revisions (project_id, id) ON DELETE CASCADE;

ALTER TABLE publication_review_requests
    ADD CONSTRAINT fk_publication_review_revision_project
        FOREIGN KEY (project_id, project_revision_id)
        REFERENCES project_revisions (project_id, id) ON DELETE CASCADE;

ALTER TABLE organization_permission_grants
    DROP CONSTRAINT organization_permission_grants_parent_grant_id_fkey,
    ADD CONSTRAINT fk_organization_grant_parent_tenant
        FOREIGN KEY (parent_grant_id, organization_id)
        REFERENCES organization_permission_grants (id, organization_id) ON DELETE CASCADE;
