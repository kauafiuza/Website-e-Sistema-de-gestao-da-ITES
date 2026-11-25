-- Executar manualmente como administrador do banco após o cadastro da conta institucional.
-- O endereço deve ser fornecido por variável do psql: -v admin_email='conta@instituicao'.
INSERT INTO app_user_roles(user_id,role_id)
SELECT u.id,r.id FROM users u CROSS JOIN app_roles r
WHERE u.email=:'admin_email' AND r.code='ADMINISTRATOR'
ON CONFLICT DO NOTHING;
