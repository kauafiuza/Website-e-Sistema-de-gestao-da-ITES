# Contribuição para a plataforma ITES

## Ambiente de desenvolvimento

Pré-requisitos: Docker Engine com Docker Compose, Node.js 22 e Java 25 para execução local dos testes. O PostgreSQL 16 é iniciado pelo Compose; não é necessário instalá-lo no host. `web/` contém o frontend React; `server/`, a API Spring Boot; `database/`, scripts acadêmicos e de administração; `docs/`, especificações e operação.

Copie `.env.example` para `.env`, defina credenciais e segredos locais distintos e execute `docker compose up --build`. Para o frontend, execute `npm ci` e os comandos `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test` e `npm run build` em `web/`. Para o backend, execute `./mvnw --batch-mode verify` em `server/`; os testes usam Testcontainers e precisam do Docker. Migrações Flyway têm fonte autoritativa em `server/src/main/resources/db/migration/`; `database/` contém cargas demonstrativas, consultas, rotinas e verificações, sem cópias concorrentes de migrações. Não execute a carga acadêmica em produção.

## Organização e padrões

Implemente interfaces e testes de frontend em `web/`; regras, autorização e acesso a dados em `server/`; SQL de apoio em `database/`; contratos e decisões em `docs/`. Preserve padrões do módulo afetado. Identificadores de código e banco usam inglês; documentação, comentários, mensagens de commit e interface de usuário usam português brasileiro. Mantenha componentes reutilizáveis, serviços coesos, erros explícitos, validação de entrada e autorização no backend. Acrescente testes para regras e fluxos alterados. Atualize documentos correspondentes à implementação real.

## Fluxo de alteração

1. Inspecione o módulo e a documentação relacionada; consulte o estado atual em `docs/IMPLEMENTATION_STATUS.md`.
2. Implemente com os padrões existentes, sem duplicar funcionalidades.
3. Atualize testes e documentação afetados.
4. Execute as verificações aplicáveis e revise o diff.
5. Crie commits focados e abra um pull request com o modelo do repositório.

Mudanças no banco exigem migração incremental, revisão de integridade, atualização do modelo lógico e teste a partir de banco vazio. Decisões arquiteturais exigem registro em ADR. Nenhuma credencial ou dado pessoal real deve ser versionado.

## Mensagens de commit

Adote Conventional Commits: `<type>(<scope>): <descrição>`. Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style` e `revert`. Escopos recomendados: `web`, `server`, `database`, `auth`, `demands`, `builder`, `docker` e `docs`. A descrição e o corpo, quando necessário, são escritos em português brasileiro. Use corpo para explicar motivação e efeitos. Mudança incompatível usa `!` após tipo/escopo e um rodapé `BREAKING CHANGE:`, com explicação em português. Exemplos: `feat(demands): adiciona envio de solicitações`; `docs(database): atualiza modelo lógico`. Autor e committer devem ser a identidade Git autorizada do proprietário; não inclua atribuição a assistentes.
