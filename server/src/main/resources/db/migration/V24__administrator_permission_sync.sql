CREATE FUNCTION ites_sync_administrator_permission() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO app_role_permissions(role_id, permission_code)
  SELECT id, NEW.code FROM app_roles WHERE code = 'ADMINISTRATOR'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ites_sync_administrator_permission
AFTER INSERT ON app_permissions
FOR EACH ROW EXECUTE FUNCTION ites_sync_administrator_permission();

INSERT INTO app_role_permissions(role_id, permission_code)
SELECT r.id, p.code
FROM app_roles r CROSS JOIN app_permissions p
WHERE r.code = 'ADMINISTRATOR'
ON CONFLICT DO NOTHING;
