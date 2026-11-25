INSERT INTO institutional_pages(slug,title)
VALUES ('painel-demandas','Painel de indicadores das demandas')
ON CONFLICT (slug) DO NOTHING;
