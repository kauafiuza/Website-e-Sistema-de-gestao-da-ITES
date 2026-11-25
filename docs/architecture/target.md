# Arquitetura da plataforma ITES

A arquitetura entregue mantém frontend, backend e banco relacional como módulos de uma única aplicação. Consulte [arquitetura implementada](implementation.md) para responsabilidades, fluxo de dados e diagramas.

## Decisões arquiteturais

| ADR | Decisão |
|---|---|
| ADR-001 | React, Spring Boot, PostgreSQL e Flyway formam a base técnica da plataforma modular. |
| ADR-002 | Portal, solicitantes e administração compartilham identidade, autorização e persistência. |
| ADR-003 | A condição de representação é registrada por demanda, pois pode variar entre solicitações do mesmo usuário. |
| ADR-004 | Mudanças de situação e eventos associados devem ser consistentes e rastreáveis. |
| ADR-005 | O editor visual altera páginas de conteúdo por meio de componentes e propriedades validados. |
| ADR-006 | Dados demonstrativos são separados da inicialização de produção. |

As concessões da aplicação são diferentes dos usuários e privilégios do PostgreSQL. A aplicação autentica pessoas; o banco limita o acesso técnico do serviço.
