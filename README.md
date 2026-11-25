# Portal institucional e gestão de demandas da ITES

Aplicação web da Incubadora Tecnológica de Economia Solidária do IFRJ Campus Niterói. O repositório contém `web/` (React e editor visual), `server/` (Spring Boot, autenticação e API), `database/` (scripts acadêmicos e de administração) e `docs/` (documentação técnica). As migrações executadas pela aplicação ficam exclusivamente em `server/src/main/resources/db/migration/`.

## Execução local com Docker

Pré-requisitos: Docker Engine e Docker Compose. Copie o modelo de configuração e gere dois segredos distintos:

```sh
cp .env.example .env
openssl rand -base64 32
openssl rand -base64 32
```

Defina em `.env` a senha do banco e os valores gerados em `AUTH_JWT_SECRET` e `AUTH_TOTP_ENCRYPTION_KEY`. Preencha `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` para provisionar o primeiro administrador na inicialização. O provisionamento só cria a conta se ela ainda não existir; não redefine a senha de uma conta preexistente. Mantenha `MAILER_ENABLED=false` para operar sem provedor de e-mail. A verificação por e-mail não é exigida para contas criadas pela administração e o segundo fator é opcional.

Inicie os serviços:

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 server
```

O portal fica em `http://localhost:3000`; a API é encaminhada por `/api/` no mesmo endereço. A verificação do frontend é `http://localhost:3000/health`, e a da API é `http://localhost:3000/api/actuator/health`. O PostgreSQL não publica porta no host. O volume `postgres_data` preserva dados entre recriações dos contêineres. Não execute `docker compose down -v` se desejar manter os dados.

Após entrar com a conta inicial, a administração pode criar contas de solicitantes em `/administracao/permissoes`. A pessoa receberá o acesso por um canal definido pela equipe; a plataforma não envia nem exibe a senha criada. Recomenda-se trocar a senha inicial após o primeiro acesso.

Para habilitar cadastro público com confirmação por link, configure `MAILER_ENABLED=true`, `RESEND_API_KEY` e `MAIL_FROM_ADDRESS` de um domínio autorizado. O vínculo com uma organização não concede permissões administrativas.

A página inicial é pública. O solicitante usa `/cadastro`, `/entrar` e `/demandas`. A equipe autorizada acessa `/administracao/demandas`, `/administracao/permissoes` e `/administracao/editor`. A API valida identidade e permissão no servidor.

## Verificação local

```sh
cd web && npm ci && npm run typecheck && npm run lint -- --max-warnings=0 && npm test && npm run build
cd ../server && ./mvnw verify
```

Os testes de backend usam Testcontainers e precisam de Docker. A pipeline de PR executa também o build das imagens Docker; veja [CI e proteção de PR](docs/ci.md). Consulte [documentação](docs/INDEX.md), [contribuição](CONTRIBUTING.md), [implantação](docs/deployment.md) e [estado de implementação](docs/IMPLEMENTATION_STATUS.md).

## Equipe

_[Kauã Fiuza Clemente](https://github.com/kauafiuza)_
_Victor Hugo Lima Monteiro_
