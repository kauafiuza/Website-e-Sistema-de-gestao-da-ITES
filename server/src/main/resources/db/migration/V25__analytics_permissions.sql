INSERT INTO app_permissions(code, description) VALUES
  ('organizations.manage', 'Consultar e administrar organizações'),
  ('analytics.view', 'Consultar indicadores e dados agregados'),
  ('dashboards.manage', 'Criar e gerenciar painéis analíticos'),
  ('reports.generate', 'Gerar relatórios administrativos'),
  ('reports.export', 'Exportar relatórios e dados autorizados'),
  ('platform.configure', 'Configurar a plataforma')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
