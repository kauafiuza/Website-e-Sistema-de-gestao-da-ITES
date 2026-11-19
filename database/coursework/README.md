# Banco de dados do ITES

Esta pasta oferece dois percursos, com finalidades distintas:

- `run_all.sql`: executa o modelo acadêmico de 12 tabelas, sua carga demonstrativa, consultas, rotinas e testes de privilégios.
- `run_product.sql`: aplica em um banco descartável as migrações oficiais do produto, diretamente de `server/src/main/resources/db/migration/`. Esse caminho disponibiliza o schema operacional mais recente sem manter uma cópia paralela das definições.

O primeiro percurso continua útil para reproduzir a atividade acadêmica documentada. O segundo é a referência para consultar a estrutura real da aplicação. Os dois usam bancos isolados: não execute `run_all.sql` no banco da aplicação, nem conecte a aplicação ao banco criado por `run_product.sql`, pois este último não contém o histórico de controle do Flyway.

## Criar o schema operacional em PostgreSQL

Na raiz do repositório, execute:

```sh
docker run -d --name ites-coursework-product \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?Defina uma senha local no ambiente}" \
  -v "$PWD:/workspace:ro" \
  postgres:16-alpine

until docker exec ites-coursework-product pg_isready -U postgres; do sleep 1; done
docker exec ites-coursework-product createdb -U postgres ites_product_coursework
docker exec ites-coursework-product psql -v ON_ERROR_STOP=1 \
  -U postgres -d ites_product_coursework \
  -f /workspace/database/coursework/run_product.sql
docker exec ites-coursework-product psql -v ON_ERROR_STOP=1 \
  -U postgres -d ites_product_coursework \
  -f /workspace/database/coursework/product_validation.sql
docker exec ites-coursework-product psql -v ON_ERROR_STOP=1 \
  -U postgres -d ites_product_coursework \
  -f /workspace/database/coursework/product_queries.sql
```

O script de validação confirma a quantidade de tabelas, os objetos de autorização, as restrições do projeto raiz e os gatilhos operacionais. As consultas são executadas sobre os dados de catálogo inseridos pelas próprias migrações; tabelas operacionais como demandas permanecem vazias nesse banco limpo. A linha de projeto raiz é criada pelo provisionador da aplicação quando há um administrador e uma organização padrão; a migração instala a estrutura que permite apenas um projeto `ROOT`.

O banco criado por `run_product.sql` é destinado à inspeção de schema e execução de consultas. Ele não recebe `flyway_schema_history`; para subir a aplicação com migrações registradas e dados iniciais, use `docker compose up --build` conforme o guia do repositório.

Para remover o ambiente descartável:

```sh
docker rm -f ites-coursework-product
```

As migrações são incluídas na ordem Flyway e cada arquivo é executado em uma transação própria, preservando o comportamento das tabelas temporárias usadas por algumas migrações. Para iniciar a aplicação, use o fluxo Docker Compose do projeto: é o Flyway integrado ao backend que deve aplicar as migrações e registrar seu histórico.
