ALTER TABLE publications
    ADD COLUMN organization_id uuid;

UPDATE publications publication
SET organization_id = project.organization_id
FROM projects project
WHERE project.id = publication.project_id;

ALTER TABLE publications
    ALTER COLUMN organization_id SET NOT NULL,
    ADD CONSTRAINT uq_publications_id_organization UNIQUE (id, organization_id),
    ADD CONSTRAINT fk_publications_project_organization
        FOREIGN KEY (project_id, organization_id)
        REFERENCES projects (id, organization_id) ON DELETE CASCADE;

ALTER TABLE form_submissions
    ADD COLUMN organization_id uuid;

UPDATE form_submissions submission
SET organization_id = publication.organization_id
FROM publications publication
WHERE publication.id = submission.publication_id;

ALTER TABLE form_submissions
    ALTER COLUMN organization_id SET NOT NULL,
    ADD CONSTRAINT fk_form_submission_publication_tenant
        FOREIGN KEY (publication_id, organization_id)
        REFERENCES publications (id, organization_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_form_submission_version_tenant
        FOREIGN KEY (form_version_id, organization_id)
        REFERENCES organization_form_versions (id, organization_id);
