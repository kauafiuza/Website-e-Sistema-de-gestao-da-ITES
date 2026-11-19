# Índice da documentação — ITES

**Situação:** os scripts SQL estão organizados em `database/coursework/academic/` e `database/coursework/product/`. O ponto de entrada `run_product.sql` aplica as migrações Flyway oficiais até a V28, sem duplicar definições; a validação confirma as 35 tabelas operacionais e os gatilhos. O modelo acadêmico mantém a exceção semântica dos catálogos pequenos. O PDF original de requisitos e o modelo institucional não foram localizados; a especificação reproduzida no pedido é a fonte utilizada.

- [Auditoria do repositório](architecture/audit.md)
- [Especificação de requisitos](requirements/specification.md)
- [Arquitetura proposta](architecture/target.md)
- [Integração com o editor de páginas](builder/integration.md)
- [Proposta da base de dados](database/technical.md)
- [Modelo lógico acadêmico (imagem)](database/logical-model.svg)
- [Scripts SQL e execução reprodutível](../database/coursework/)
- [Acesso isolado ao schema operacional](../database/coursework/README.md)
- [Evidência PostgreSQL 16](database/evidence/coursework-validation-postgresql16.md)
- [Evidência do schema operacional PostgreSQL 16](database/evidence/product-schema-validation-postgresql16.md)
- [Evidência de contas e privilégios](database/evidence/database-users-validation-postgresql16.txt)
- [Roteiro de entrega e validação](plans/delivery.md)
- [Situação atual](CHECKPOINT.md)

A organização preserva os nomes `docs` e `database` previstos no repositório. Os arquivos simples que antes ocupavam esses caminhos continham apenas comentários sobre a finalidade das pastas; consulte a auditoria. Não há diretórios classificados pela idade da implementação.
- [Implantação](deployment.md)
- [Contribuição](../CONTRIBUTING.md)
- [Modelo de pull request](../.github/pull_request_template.md)
A organização do repositório mantém as pastas `docs` (documentação) e `database` (scripts do banco de dados). Os arquivos de texto que existiam inicialmente nesses caminhos apenas indicavam a finalidade de cada pasta; ver a auditoria.
- [Integração da base executável](architecture/implementation.md)
- [Estado de implementação e ponto de retomada](IMPLEMENTATION_STATUS.md)

- [Integração contínua](ci.md)
- [Comparação de autorização e provisão de administrador](security/comparison-cplug-scraper.md)
- [Consulta de respostas, indicadores e exportações](security/analytics-and-responses.md)
