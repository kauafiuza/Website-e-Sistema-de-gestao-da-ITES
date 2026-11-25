# Aplicação web da ITES

Interface do portal institucional e do sistema de gestão da Incubadora Tecnológica de Economia Solidária do IFRJ Campus Niterói. O frontend usa React, TypeScript, Vite, Tailwind CSS e componentes reutilizáveis. No Compose, os arquivos estáticos são servidos por Nginx, que encaminha as chamadas `/api/` à API.

## Responsabilidades

- Portal público e navegação institucional.
- Cadastro, autenticação, organizações e acompanhamento de demandas.
- Administração de demandas, contas e permissões.
- Edição, prévia e publicação de páginas institucionais por blocos validados.
- Chamadas HTTP, estado de sessão e apresentação de ações conforme concessões.

As permissões são sempre confirmadas pelo backend. Conteúdo visual não substitui validações nem controles de acesso.

## Organização

- `src/router/`: rotas e proteção de navegação.
- `src/context/`: sessão e estado compartilhado.
- `src/pages/`: portal, jornadas de usuário, administração e edição de páginas.
- `src/services/`: integração HTTP com a API.
- `src/types/`: contratos TypeScript.
- `src/utils/blocks/`: componentes de conteúdo, definições e catálogo.
- `src/utils/pages/`: composições de páginas por identificadores de bloco.
- `scripts/generate-catalog.mjs`: valida e gera os arquivos derivados do catálogo.

## Desenvolvimento local

```sh
npm ci
npm run dev
```

Para verificar tipos, catálogo, lint, testes e build:

```sh
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run build
```
