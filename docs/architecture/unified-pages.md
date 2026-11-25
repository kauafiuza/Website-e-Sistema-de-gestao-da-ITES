# Gestão de páginas do ITES

## Estado implementado em 19/11/2026

A página pública `/` pertence ao projeto `ITES`, identificado por `projects.site_role = 'ROOT'`. O índice parcial `uq_projects_root_site` limita esse papel a um projeto. O provisionamento transacional importa a última versão publicada de `inicio`, preserva o conteúdo existente e cria uma publicação vinculada ao projeto. A operação é idempotente; reiniciar a API não cria outro projeto raiz.

O editor principal usa `projects.document` para o rascunho, `project_revisions` para histórico e `publication_versions` para instantâneos publicados. O endpoint público `/ites/pages/inicio` lê exclusivamente a publicação ativa do projeto raiz. A rota `/` renderiza o documento retornado. A URL anterior `/administracao/editor` redireciona para a lista principal de projetos; a API anterior de edição de `inicio` responde 404. Os registros institucionais anteriores permanecem no banco como origem histórica da migração.

O administrador do sistema pode publicar diretamente a revisão atual do projeto raiz, sem uma segunda pessoa. A exceção é resolvida no serviço de publicação com o papel administrativo persistido e o papel `ROOT` do projeto. Para os demais projetos, a revisão por outra pessoa continua obrigatória. O projeto raiz não pode ser excluído pela API.

## Fronteiras ainda existentes

As páginas operacionais e de autenticação continuam declaradas em `web/src/router/Router.tsx`, e o painel de indicadores mantém seu documento em `institutional_pages`. Publicação privada, permissões por página, resolução unificada de rotas e componentes operacionais no registro do editor ainda não foram implementados. Por isso, a migração da página inicial está concluída, mas a gestão de **todas** as páginas pelo editor principal permanece pendente.

| Área | Estado atual | Próxima integração |
|---|---|---|
| Página inicial `/` | Projeto único `ROOT`, rascunho e publicação pelo editor principal | Configuração explícita de visibilidade |
| Outras páginas institucionais | Versões em `institutional_pages` | Importação e roteamento por projeto |
| Autenticação e conta | Rotas React protegidas e API própria | Blocos de apresentação com comportamento protegido |
| Demandas, organizações, revisões e auditoria | Telas React e serviços autorizados | Componentes funcionais registrados no editor |
| Indicadores e relatórios | Telas e documento de painel separados | Fontes de dados autorizadas e composição no editor |

## Regras da migração restante

A publicação deverá exigir visibilidade `PUBLIC` ou `PRIVATE`. O servidor deverá resolver projeto, rota, revisão publicada, autenticação e concessões antes de devolver um documento privado. Visitantes anônimos serão redirecionados para a entrada; usuários autenticados sem permissão receberão 404. Componentes operacionais deverão manter autorização e validação nos serviços existentes. Rotas de sistema não poderão ser ocupadas por páginas configuráveis. A migração será feita por área, com regressão de cada jornada antes de retirar sua apresentação anterior.
