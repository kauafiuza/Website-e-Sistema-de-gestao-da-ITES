ALTER TABLE organization_form_versions
    ADD COLUMN name varchar(200);

WITH historical_names AS (
    SELECT version.id AS form_version_id,
           left(COALESCE(NULLIF(block.value #>> '{props,title}', ''),
                         block.value ->> 'definitionId'), 200) AS form_name,
           row_number() OVER (PARTITION BY version.id ORDER BY publication.version_number) AS position
    FROM organization_form_versions version
    JOIN organization_forms form ON form.id = version.form_id
    JOIN publication_versions publication
      ON EXISTS (
          SELECT 1 FROM jsonb_array_elements(publication.form_references) reference(value)
          WHERE reference.value ->> 'formVersionId' = version.id::text
            AND reference.value ->> 'pageId' = form.source_page_id
            AND reference.value ->> 'blockId' = form.source_block_id
      )
    CROSS JOIN LATERAL jsonb_array_elements(publication.document -> 'pages') page(value)
    CROSS JOIN LATERAL jsonb_array_elements(page.value -> 'blocks') block(value)
    WHERE page.value ->> 'id' = form.source_page_id
      AND block.value ->> 'id' = form.source_block_id
)
UPDATE organization_form_versions version
SET name = historical.form_name
FROM historical_names historical
WHERE historical.form_version_id = version.id AND historical.position = 1;

UPDATE organization_form_versions version
SET name = form.name
FROM organization_forms form
WHERE form.id = version.form_id AND version.name IS NULL;

ALTER TABLE organization_form_versions
    ALTER COLUMN name SET NOT NULL;
