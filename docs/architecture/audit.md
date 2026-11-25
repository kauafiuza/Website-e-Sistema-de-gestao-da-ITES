# Auditoria da arquitetura ITES

## Estado do sistema

A aplicação está organizada em `web/`, `server/` e `database/`, com documentação técnica em `docs/`. O frontend usa React, TypeScript e Vite. O backend usa Java, Spring Boot, Spring Security, JDBC e Flyway. O banco operacional é PostgreSQL e o ambiente local usa Docker Compose.

O frontend concentra o portal público, as áreas de solicitantes e de administração e um editor visual de páginas institucionais. O backend fornece autenticação, autorização por concessões, regras de demandas, persistência de conteúdo, revisão e publicação. As migrações Flyway são a fonte operacional do esquema.

## Capacidades implementadas

- Cadastro, confirmação de e-mail, autenticação por sessão e gestão de conta.
- Organizações, membros, papéis e permissões com validação no backend.
- Envio, classificação, decisão, histórico e acompanhamento de demandas.
- Páginas institucionais com rascunho, prévia, publicação e retirada do ar.
- Catálogo controlado de blocos e propriedades validadas antes da persistência.
- Compose com serviços web, API e banco, volume persistente e verificações de saúde.

## Limites e riscos conhecidos

- A navegação de notícias, eventos, biblioteca e publicações ainda contém conteúdo estático; o editor gerencia páginas institucionais versionadas.
- A validação automatizada do frontend não substitui testes de navegador, acessibilidade manual ou revisão visual em dispositivos reais.
- A implantação em uma VPS e a configuração de domínio, TLS, e-mail e backups dependem do ambiente operacional.
- Os artefatos acadêmicos de banco de dados ainda precisam ser reconciliados com o esquema operacional completo antes de serem apresentados como modelo físico equivalente.

## Diretrizes de evolução

Manter uma única identidade e persistência, reforçar a segregação entre credenciais de migração e runtime, ampliar a cobertura ponta a ponta e atualizar esta auditoria quando os limites descritos forem resolvidos.
