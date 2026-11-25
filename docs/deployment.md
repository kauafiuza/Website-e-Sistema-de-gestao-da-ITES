# Implantação em VPS com Docker Compose e Dokploy

A configuração usa três serviços: `web` (Nginx com frontend estático), `server` (Spring Boot) e `postgres` (PostgreSQL 16). Somente `web` publica porta no host. O Nginx encaminha `/api/` para `server:8080` na rede interna; o backend acessa `postgres:5432`. `postgres_data` mantém o banco após recriação dos contêineres. A aplicação aplica migrações Flyway na inicialização; a carga acadêmica não é executada automaticamente.

## Preparação

1. Instale Docker Engine e o plugin Compose na VPS.
2. Disponibilize o repositório e crie `.env` a partir de `.env.example`.
3. Defina `DB_PASSWORD` forte e dois segredos Base64 independentes, gerados por `openssl rand -base64 32`.
4. Defina `AUTH_BROWSER_ORIGINS` e `APP_BASE_URL` para o domínio HTTPS definitivo e `AUTH_COOKIE_SECURE=true`.
5. Configure `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` antes da primeira inicialização. O backend cria essa conta uma única vez, já verificada, e associa o papel de administrador. Guarde a senha inicial em um canal seguro e troque-a após o primeiro acesso.
6. O e-mail é opcional. Sem provedor, administradores criam contas de solicitantes em `/administracao/permissoes`; para ativar cadastro público com link, configure `MAILER_ENABLED=true`, `RESEND_API_KEY` e `MAIL_FROM_ADDRESS` autorizado.
7. Defina `WEB_HOST_PORT` para a porta interna publicada no host; configure domínio, proxy reverso e certificado TLS no Dokploy apontando para o serviço `web`.

No Dokploy, crie uma aplicação Docker Compose ligada ao repositório e a `compose.yaml`. Cadastre as variáveis como segredos do ambiente. Não exponha a porta do PostgreSQL. Atualizações devem usar uma revisão versionada do repositório; examine `docker compose ps`, `docker compose logs server` e os health checks após cada implantação. O frontend responde em `/health`, e a API em `/api/actuator/health`. O `server` aguarda o PostgreSQL saudável; `web` aguarda o `server` saudável. Os serviços reiniciam salvo parada explícita.

Faça backup consistente do PostgreSQL antes de atualizações de esquema, por exemplo com `pg_dump` executado no contêiner e guardado fora da VPS. Teste restauração em ambiente isolado. Reverter uma imagem não reverte automaticamente migrações: planeje compatibilidade de esquema antes do rollback. Nunca restaure dados acadêmicos em produção.

A execução local segue o [README](../README.md). A configuração de Dokploy ainda precisa de teste em uma instância real; não há evidência de publicação em VPS.
