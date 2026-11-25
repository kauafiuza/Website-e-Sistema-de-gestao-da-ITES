# API da ITES

Backend institucional responsável por autenticação, autorização, organizações, demandas, conteúdo e publicação de páginas. A aplicação usa Java 25, Spring Boot 4.1.1, PostgreSQL, JDBC e Flyway.

## Organização

O código fica em `src/main/java/br/com/ites/server/` e é organizado por responsabilidade:

- `controllers/`: endpoints REST e conversão de parâmetros HTTP.
- `services/`: fluxos de aplicação, validação de regras, autorização e transações.
- `repositories/`: consultas e comandos SQL.
- `models/` e `utils/dtos/`: modelos e contratos HTTP.
- `configs/`: segurança, OpenAPI e configurações Spring.
- `db/migration/`: única fonte de migrações operacionais Flyway.

A persistência usa `JdbcTemplate` e SQL explícito. A associação institucional não concede permissões administrativas. As operações protegidas validam concessões e propriedade dos registros no backend.

## Documentação da API

Com a aplicação iniciada, a especificação pode ser consultada em:

- Swagger UI: `http://localhost:8081/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8081/v3/api-docs`
- OpenAPI YAML: `http://localhost:8081/v3/api-docs.yaml`

A disponibilidade desses recursos pode ser configurada por `OPENAPI_ENABLED` e `SWAGGER_UI_ENABLED`. Operações privadas continuam sujeitas às verificações de autenticação e autorização.

## Execução e testes

A configuração local é descrita no [guia da raiz](../README.md). A suíte de backend usa Testcontainers e requer Docker:

```sh
./mvnw --batch-mode verify
```
