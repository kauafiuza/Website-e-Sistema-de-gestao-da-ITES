# Índice da documentação — ITES

**Situação:** o modelo acadêmico, as consultas, rotinas, privilégios e contas foram executados em PostgreSQL 16 com evidências, e todas as 12 tabelas têm pelo menos 20 registros. Esses artefatos ainda não foram reconciliados com o schema integrado da aplicação. Os requisitos têm como fonte o [documento de referência da ITES](requirements/proposta-portal-e-sistema-de-gestao-ites.pdf) (*Proposta de Desenvolvimento do Portal Web e Sistema de Gestão da ITES*).

- [Auditoria do repositório](architecture/audit.md)
- [Especificação de requisitos](requirements/specification.md)
- [Arquitetura proposta](architecture/target.md)
- [Integração com o editor de páginas](builder/integration.md)
- [Proposta da base de dados](database/technical.md)
- [Modelo lógico (imagem)](database/logical-model.svg)
- [Scripts SQL e execução reprodutível](../database/coursework/)
- [Evidência PostgreSQL 16](database/evidence/coursework-validation-postgresql16.md)
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
