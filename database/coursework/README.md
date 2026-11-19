# Banco de dados do ITES

Os scripts estão separados por finalidade: `academic/` contém o modelo relacional da atividade acadêmica; `product/` prepara uma instância descartável com as migrações oficiais do produto. Os dois percursos usam bancos diferentes.

## Mapa dos arquivos

```text
database/coursework/
├── academic/
│   ├── 01_schema.sql             # tabelas, relações, restrições e índices
│   ├── 02_seed.sql               # dados fictícios de demonstração
│   ├── 03_queries.sql            # consultas simples, JOINs e subconsultas
│   ├── 04_routines.sql           # funções, procedimentos e gatilhos acadêmicos
│   ├── 05_security.sql           # papéis de banco e privilégios
│   ├── 06_validation.sql         # contagens e testes funcionais
│   ├── 07_security_tests.sql     # testes de acesso permitido e negado
│   ├── 08_provision_users.sql    # criação interativa de usuários LOGIN
│   └── run_all.sql               # execução acadêmica na ordem necessária
├── product/
│   ├── 01_apply_migrations.sql   # inclui as migrações oficiais V1–V28
│   ├── 02_validate_schema.sql    # valida tabelas, grants e gatilhos
│   ├── 03_queries.sql            # consultas sobre as tabelas operacionais
│   └── run_all.sql               # orquestra o percurso do produto
├── run_all.sql                   # ponto de entrada acadêmico preservado
└── run_product.sql               # ponto de entrada do schema operacional
```

`product/01_apply_migrations.sql` aponta para os arquivos Flyway em `server/src/main/resources/db/migration/`; não há uma segunda cópia das definições de tabelas. O script executa cada migração em uma transação própria. O banco criado por esse percurso é somente para inspeção e não possui `flyway_schema_history`, então não deve ser conectado ao backend.

## Executar o modelo acadêmico

Use um banco vazio e dedicado em PostgreSQL 16. O percurso inclui schema, rotinas, dados fictícios, consultas, validação e testes de privilégios:

```sh
docker run -d --name ites-db-academico \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?Defina uma senha local no ambiente}" \
  -v "$PWD/database/coursework:/coursework:ro" \
  -p 127.0.0.1:55432:5432 postgres:16-alpine

until docker exec ites-db-academico pg_isready -U postgres; do sleep 1; done
docker exec ites-db-academico createdb -U postgres ites_coursework
docker exec ites-db-academico psql -v ON_ERROR_STOP=1 \
  -U postgres -d ites_coursework -f /coursework/run_all.sql
```

O script `academic/08_provision_users.sql` é interativo e deve ser executado separadamente por uma pessoa administradora depois de `run_all.sql`. As senhas são solicitadas pelo `psql` e não ficam armazenadas no repositório.

## Executar o schema operacional

Na raiz do repositório, crie um ambiente PostgreSQL descartável:

```sh
docker run -d --name ites-coursework-product \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?Defina uma senha local no ambiente}" \
  -v "$PWD:/workspace:ro" postgres:16-alpine

until docker exec ites-coursework-product pg_isready -U postgres; do sleep 1; done
docker exec ites-coursework-product createdb -U postgres ites_product_coursework
docker exec ites-coursework-product psql -v ON_ERROR_STOP=1 \
  -U postgres -d ites_product_coursework \
  -f /workspace/database/coursework/run_product.sql
```

Esse comando aplica as migrações, valida a estrutura e executa as consultas. Como não carrega dados de negócio, consultas sobre demandas e publicações retornam zero linhas. A página inicial publicada e o projeto `ROOT` são provisionados pelo backend quando há administrador e organização padrão.

Para abrir uma sessão interativa no terminal dentro do contêiner de produto, execute:

```sh
docker exec -it ites-coursework-product psql -U postgres -d ites_product_coursework
```

No prompt do `psql`, `\dt` lista as tabelas e `\d+ public.demands` mostra colunas, tipos, índices e restrições da tabela de demandas.

Remova cada contêiner descartável ao terminar:

```sh
docker rm -f ites-db-academico
docker rm -f ites-coursework-product
```

Para executar a aplicação, use Docker Compose. O backend deve aplicar as migrações pelo Flyway e registrar o histórico no banco de execução.
