ALTER TABLE projects
    ADD CONSTRAINT uq_projects_id_organization UNIQUE (id, organization_id);

CREATE TABLE organization_forms (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    source_page_id varchar(100) NOT NULL,
    source_block_id varchar(100) NOT NULL,
    name varchar(200) NOT NULL,
    definition_id varchar(100) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_organization_form_project_source UNIQUE (project_id, source_page_id, source_block_id),
    CONSTRAINT uq_organization_form_id_tenant UNIQUE (id, organization_id),
    CONSTRAINT fk_organization_form_project_tenant FOREIGN KEY (project_id, organization_id)
        REFERENCES projects(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_organization_forms_tenant_updated
    ON organization_forms (organization_id, updated_at DESC, id);

CREATE TABLE organization_form_versions (
    id uuid PRIMARY KEY,
    form_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    version_number integer NOT NULL CHECK (version_number > 0),
    definition_id varchar(100) NOT NULL,
    field_schema jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_organization_form_version_number UNIQUE (form_id, version_number),
    CONSTRAINT uq_organization_form_version_tenant UNIQUE (id, organization_id),
    CONSTRAINT fk_organization_form_version_tenant FOREIGN KEY (form_id, organization_id)
        REFERENCES organization_forms(id, organization_id) ON DELETE CASCADE
);

ALTER TABLE publication_versions
    ADD COLUMN form_references jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TEMPORARY TABLE form_backfill_sources ON COMMIT DROP AS
SELECT p.project_id, pr.organization_id, v.publication_id, v.version_number AS publication_version,
       page.value ->> 'id' AS page_id, block.value ->> 'id' AS block_id,
       block.value ->> 'definitionId' AS definition_id,
       left(COALESCE(NULLIF(btrim(block.value #>> '{props,title}'), ''), block.value ->> 'definitionId'), 200) AS form_name,
       COALESCE(block.value #> '{props,formFields}', CASE block.value ->> 'definitionId'
           WHEN 'form-classic' THEN '[{"id":"name","label":"Seu nome","type":"text","required":true},{"id":"email","label":"E-mail","type":"email","required":true}]'::jsonb
           WHEN 'contact-classic' THEN '[{"id":"name","label":"Seu nome","type":"text","required":true},{"id":"email","label":"E-mail","type":"email","required":true},{"id":"message","label":"Mensagem","type":"textarea","required":true}]'::jsonb
           WHEN 'contact-panel' THEN '[{"id":"email","label":"E-mail","type":"email","required":true},{"id":"message","label":"Mensagem","type":"textarea","required":true}]'::jsonb
           WHEN 'waitlist-classic' THEN '[{"id":"email","label":"E-mail","type":"email","required":true}]'::jsonb
           WHEN 'demo-request' THEN '[{"id":"firstName","label":"Nome","type":"text","required":true},{"id":"lastName","label":"Sobrenome","type":"text","required":true},{"id":"email","label":"E-mail profissional","type":"email","required":true},{"id":"role","label":"Cargo","type":"text","required":false},{"id":"project","label":"O que você quer desenvolver?","type":"textarea","required":false}]'::jsonb
       END) AS field_schema
FROM publication_versions v
JOIN publications p ON p.id = v.publication_id
JOIN projects pr ON pr.id = p.project_id
CROSS JOIN LATERAL jsonb_array_elements(v.document -> 'pages') page(value)
CROSS JOIN LATERAL jsonb_array_elements(page.value -> 'blocks') block(value)
WHERE block.value ->> 'definitionId' IN ('form-classic', 'contact-classic', 'contact-panel', 'waitlist-classic', 'demo-request');

CREATE TEMPORARY TABLE form_backfill_resources ON COMMIT DROP AS
SELECT DISTINCT ON (project_id, page_id, block_id)
       gen_random_uuid() AS form_id, project_id, organization_id, page_id, block_id,
       form_name, definition_id
FROM form_backfill_sources
ORDER BY project_id, page_id, block_id, publication_version;

INSERT INTO organization_forms (id, organization_id, project_id, source_page_id, source_block_id, name, definition_id)
SELECT form_id, organization_id, project_id, page_id, block_id, form_name, definition_id
FROM form_backfill_resources;

CREATE TEMPORARY TABLE form_backfill_variants ON COMMIT DROP AS
SELECT gen_random_uuid() AS form_version_id, resource.form_id, resource.organization_id,
       source.definition_id, source.field_schema, min(source.publication_version) AS first_publication_version
FROM form_backfill_sources source
JOIN form_backfill_resources resource
  ON resource.project_id = source.project_id AND resource.page_id = source.page_id
 AND resource.block_id = source.block_id
GROUP BY resource.form_id, resource.organization_id, source.definition_id, source.field_schema;

CREATE TEMPORARY TABLE form_backfill_versions ON COMMIT DROP AS
SELECT form_version_id, form_id, organization_id, definition_id, field_schema,
       row_number() OVER (PARTITION BY form_id ORDER BY first_publication_version, definition_id, field_schema)::integer AS form_version
FROM form_backfill_variants;

INSERT INTO organization_form_versions (id, form_id, organization_id, version_number, definition_id, field_schema)
SELECT form_version_id, form_id, organization_id, form_version, definition_id, field_schema
FROM form_backfill_versions;

UPDATE publication_versions publication
SET form_references = COALESCE(form_refs.value, '[]'::jsonb)
FROM (
    SELECT source.publication_id, source.publication_version,
       jsonb_agg(jsonb_build_object(
               'pageId', source.page_id,
               'blockId', source.block_id,
               'formId', resource.form_id,
               'formVersionId', version.form_version_id,
               'formVersion', version.form_version
           ) ORDER BY source.page_id, source.block_id) AS value
    FROM form_backfill_sources source
    JOIN form_backfill_resources resource
      ON resource.project_id = source.project_id AND resource.page_id = source.page_id
     AND resource.block_id = source.block_id
    JOIN form_backfill_variants variant
      ON variant.form_id = resource.form_id
     AND variant.definition_id = source.definition_id AND variant.field_schema = source.field_schema
    JOIN form_backfill_versions version ON version.form_version_id = variant.form_version_id
    GROUP BY source.publication_id, source.publication_version
) form_refs
WHERE publication.publication_id = form_refs.publication_id
  AND publication.version_number = form_refs.publication_version;

ALTER TABLE form_submissions ADD COLUMN form_version_id uuid;

UPDATE form_submissions submission
SET form_version_id = (reference.value ->> 'formVersionId')::uuid
FROM publication_versions publication
CROSS JOIN LATERAL jsonb_array_elements(publication.form_references) reference(value)
WHERE publication.publication_id = submission.publication_id
  AND publication.version_number = submission.version_number
  AND reference.value ->> 'pageId' = submission.page_id
  AND reference.value ->> 'blockId' = submission.block_id;

INSERT INTO organization_forms (id, organization_id, project_id, source_page_id, source_block_id, name, definition_id)
SELECT gen_random_uuid(), project.organization_id, publication.project_id, submission.page_id,
       submission.block_id, left(submission.form_name, 200), 'legacy-form'
FROM form_submissions submission
JOIN publications publication ON publication.id = submission.publication_id
JOIN projects project ON project.id = publication.project_id
WHERE submission.form_version_id IS NULL
ON CONFLICT (project_id, source_page_id, source_block_id) DO NOTHING;

INSERT INTO organization_form_versions (id, form_id, organization_id, version_number, definition_id, field_schema)
SELECT gen_random_uuid(), variants.form_id, variants.organization_id,
       COALESCE((SELECT max(existing.version_number) FROM organization_form_versions existing
                 WHERE existing.form_id = variants.form_id), 0)
           + row_number() OVER (PARTITION BY variants.form_id ORDER BY variants.field_schema)::integer,
       variants.definition_id, variants.field_schema
FROM (
    SELECT DISTINCT form.id AS form_id, form.organization_id, form.definition_id,
           COALESCE(submission.field_schema, '[]'::jsonb) AS field_schema
    FROM form_submissions submission
    JOIN publications publication ON publication.id = submission.publication_id
    JOIN organization_forms form ON form.project_id = publication.project_id
        AND form.source_page_id = submission.page_id AND form.source_block_id = submission.block_id
    WHERE submission.form_version_id IS NULL
) variants
WHERE NOT EXISTS (
    SELECT 1 FROM organization_form_versions existing
    WHERE existing.form_id = variants.form_id
      AND existing.definition_id = variants.definition_id
      AND existing.field_schema = variants.field_schema
)
ON CONFLICT (form_id, version_number) DO NOTHING;

UPDATE form_submissions submission
SET form_version_id = form_version.id
FROM publications publication
JOIN organization_forms form ON form.project_id = publication.project_id
JOIN organization_form_versions form_version ON form_version.form_id = form.id
WHERE publication.id = submission.publication_id
  AND form.source_page_id = submission.page_id AND form.source_block_id = submission.block_id
  AND form_version.definition_id = form.definition_id
  AND form_version.field_schema = COALESCE(submission.field_schema, '[]'::jsonb)
  AND submission.form_version_id IS NULL;

ALTER TABLE form_submissions
    ADD CONSTRAINT fk_form_submission_version FOREIGN KEY (form_version_id)
        REFERENCES organization_form_versions(id);
ALTER TABLE form_submissions ALTER COLUMN form_version_id SET NOT NULL;
CREATE INDEX idx_form_submissions_form_version ON form_submissions(form_version_id, occurred_at DESC);
