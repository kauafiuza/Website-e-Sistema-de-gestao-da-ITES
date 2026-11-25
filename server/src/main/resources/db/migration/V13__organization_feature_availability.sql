CREATE TABLE organization_feature_catalog (
    feature_key varchar(64) NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    name varchar(100) NOT NULL,
    description varchar(500) NOT NULL,
    is_current boolean NOT NULL DEFAULT false,
    default_enabled_for_new_organizations boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (feature_key, version)
);

CREATE UNIQUE INDEX uk_organization_feature_catalog_current
    ON organization_feature_catalog (feature_key) WHERE is_current;

CREATE TABLE organization_feature_availability (
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key varchar(64) NOT NULL,
    feature_version integer NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, feature_key),
    CONSTRAINT fk_organization_feature_catalog_version
        FOREIGN KEY (feature_key, feature_version)
        REFERENCES organization_feature_catalog (feature_key, version)
);

INSERT INTO organization_feature_catalog
    (feature_key, version, name, description, is_current, default_enabled_for_new_organizations)
VALUES
    ('PROJECTS', 1, 'Projetos', 'Criação, edição e leitura de projetos.', true, true),
    ('THEMES', 1, 'Temas', 'Criação, edição e leitura de temas visuais.', true, true),
    ('PUBLICATIONS', 1, 'Publicações', 'Publicação, leitura, métricas e atividade.', true, true),
    ('FORM_RESPONSES', 1, 'Respostas de formulários', 'Leitura e exportação de respostas recebidas.', true, true);

-- Organizações existentes mantêm acesso aos recursos que já utilizavam.
INSERT INTO organization_feature_availability
    (organization_id, feature_key, feature_version, enabled)
SELECT organization.id, feature.feature_key, feature.version, true
FROM organizations organization
CROSS JOIN organization_feature_catalog feature
WHERE feature.is_current AND feature.default_enabled_for_new_organizations;

CREATE INDEX idx_organization_feature_availability_enabled
    ON organization_feature_availability (organization_id, feature_key, enabled);
