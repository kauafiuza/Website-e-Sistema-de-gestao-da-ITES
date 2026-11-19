# Evidência do schema operacional em PostgreSQL 16

## Ambiente

As migrações oficiais foram aplicadas em um contêiner descartável `postgres:16-alpine`, com banco vazio e sem porta de rede publicada. O contêiner recebeu o repositório em modo somente leitura. A execução usou `database/coursework/run_product.sql`, que delega a `product/01_apply_migrations.sql`, inclui os arquivos Flyway de V1 a V28 em ordem e confirma cada migração em sua própria transação.

O mesmo percurso executou `product/02_validate_schema.sql` e `product/03_queries.sql`, ambos com `psql -v ON_ERROR_STOP=1`. A saída capturada integralmente após a reorganização está em [product-schema-validation-postgresql16.txt](product-schema-validation-postgresql16.txt).

## Resultado

- As migrações de V1 a V28 terminaram sem erro.
- Foram encontradas 35 tabelas de aplicação.
- O catálogo contém 17 permissões e o papel `ADMINISTRATOR` recebeu as 17 associações.
- A restrição de unicidade do projeto `ROOT` está instalada.
- As oito páginas institucionais previstas pelas migrações estão presentes.
- Os quatro gatilhos operacionais foram listados: sincronização de grants administrativos, validação de transições de demandas e duas proteções da auditoria organizacional.
- Os testes confirmaram a sincronização de uma permissão recém-inserida para o administrador, aceitaram uma transição válida e rejeitaram uma transição inválida de demanda, além de rejeitar `UPDATE` e `TRUNCATE` na auditoria.
- As 11 consultas do schema operacional executaram sem erro.

O banco de estudo foi criado somente pelas migrações, sem inicialização do backend ou carga de dados de negócio. Por isso, o projeto raiz ainda não aparece como linha em `projects`, e as consultas de demandas, organizações e publicações retornam zero linhas. O provisionador da aplicação cria a página inicial publicada e o projeto raiz após existirem administrador e organização padrão. A evidência comprova a construção e inspeção do schema; não comprova o fluxo de inicialização de dados da aplicação.

## Reprodutibilidade

As instruções para repetir a execução estão em [database/coursework/README.md](../../../database/coursework/README.md). Esse banco é descartável e não contém `flyway_schema_history`; ele não deve ser conectado ao backend. A inicialização da aplicação deve continuar usando Docker Compose e o Flyway integrado ao servidor.
