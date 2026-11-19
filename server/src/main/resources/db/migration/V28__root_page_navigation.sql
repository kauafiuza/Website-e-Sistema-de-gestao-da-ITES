-- Acrescenta a navegação editável ao projeto raiz existente sem alterar versões históricas.
DO $$
DECLARE
    root_record record;
    updated_document jsonb;
    navigation jsonb := $navigation$ {"id":"ites-navigation","definitionId":"navbar-classic","props":{"title":"ITES · IFRJ Niterói","imageUrl":"","imageAlt":"","logoHref":"/","showThemeToggle":false,"items":[{"id":"home","title":"Início","description":"","href":"/","value":"","features":[]},{"id":"about","title":"Quem somos","description":"","href":"/institucional/quem-somos","value":"","features":[]},{"id":"projects","title":"Projetos","description":"","href":"/institucional/projetos","value":"","features":[]},{"id":"news","title":"Notícias","description":"","href":"/institucional/noticias","value":"","features":[]},{"id":"publications","title":"Publicações","description":"","href":"/institucional/publicacoes","value":"","features":[]},{"id":"access","title":"Acessar","description":"","href":"/entrar","value":"","features":[]}]}} $navigation$::jsonb;
    revision_id uuid;
    references_snapshot jsonb;
BEGIN
    FOR root_record IN
        SELECT p.id, p.owner_id, p.document, p.route_blueprint, p.revision,
               publication.id AS publication_id, publication.current_version
        FROM projects p
        JOIN publications publication ON publication.project_id = p.id
        WHERE p.site_role = 'ROOT'
        FOR UPDATE OF p, publication
    LOOP
        updated_document := root_record.document;
        IF NOT updated_document ? 'navbar' THEN
            updated_document := jsonb_set(updated_document, '{navbar}', navigation, true);
        END IF;
        IF NOT updated_document ? 'rootPageId' THEN
            updated_document := jsonb_set(updated_document, '{rootPageId}', updated_document #> '{pages,0,id}', true);
        END IF;
        updated_document := jsonb_set(updated_document, '{pages}', (
            SELECT jsonb_agg(
                CASE WHEN block_page.value ->> 'id' = 'ites-inicio'
                    THEN jsonb_set(block_page.value, '{blocks}', (
                        SELECT jsonb_agg(
                            CASE WHEN block.value ->> 'id' = 'ites-projetos'
                                  AND block.value ->> 'definitionId' = 'portfolio-classic'
                                THEN jsonb_set(block.value, '{definitionId}', '"features-classic"'::jsonb)
                                WHEN block.value ->> 'id' IN ('ites-publicacoes', 'ites-contato')
                                  AND block.value ->> 'definitionId' IN ('download-classic', 'contact-classic')
                                THEN jsonb_set(block.value, '{definitionId}', '"cta-classic"'::jsonb)
                                ELSE block.value END ORDER BY block.ordinal)
                        FROM jsonb_array_elements(block_page.value -> 'blocks') WITH ORDINALITY block(value, ordinal)
                    ))
                    ELSE block_page.value END ORDER BY block_page.ordinal)
            FROM jsonb_array_elements(updated_document -> 'pages') WITH ORDINALITY block_page(value, ordinal)
        ), true);
        IF updated_document = root_record.document THEN CONTINUE; END IF;
        revision_id := gen_random_uuid();
        UPDATE projects SET document = updated_document, revision = revision + 1, updated_at = now()
        WHERE id = root_record.id;
        INSERT INTO project_revisions(id, project_id, revision_number, revision_kind, document,
                                      route_blueprint, created_by)
        VALUES(revision_id, root_record.id, root_record.revision + 1, 'DRAFT',
               updated_document, root_record.route_blueprint, root_record.owner_id);
        SELECT form_references INTO references_snapshot FROM publication_versions
        WHERE publication_id = root_record.publication_id AND version_number = root_record.current_version;
        INSERT INTO publication_versions(id, publication_id, project_id, version_number, document,
                                         route_blueprint, project_revision, project_revision_id, form_references)
        VALUES(gen_random_uuid(), root_record.publication_id, root_record.id,
               root_record.current_version + 1, updated_document, root_record.route_blueprint,
               root_record.revision + 1, revision_id, COALESCE(references_snapshot, '[]'::jsonb));
        UPDATE publications SET current_version = current_version + 1
        WHERE id = root_record.publication_id;
    END LOOP;
END $$;
