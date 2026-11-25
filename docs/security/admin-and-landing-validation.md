# Validação administrativa e da página inicial

## Causa das falhas de autorização

O papel global `ADMINISTRATOR` já recebia as permissões cadastradas no catálogo da aplicação e a migration V24 também sincronizava permissões globais futuras. Isso não criava grants no modelo organizacional. O serviço de autorização por escopo exigia membership ativo, módulo habilitado e uma concessão para a organização ou projeto antes de consultar qualquer papel global. Por isso, a auditoria retornava a mensagem sobre `ORGANIZATION_AUDIT_READ` e a caixa `Revisões` não localizava projetos aprováveis para a conta administrativa. Não havia falha de token ou cache: as verificações de escopo não consultavam o papel.

## Estratégia aplicada

`OrganizationAuthorizationService` agora consulta o papel persistido `ADMINISTRATOR` por meio de `ItesAccessService` em cada operação. Essa resolução não depende de claims de permissão no JWT nem de cache. Para administradores ativos, a autoridade é global dentro do conjunto de organizações existentes; operações sobre projeto ou tema verificam que o recurso pertence à organização solicitada. A lista de organizações e de funcionalidades inclui todos os registros para a administração do sistema.

Para os demais usuários, permanecem obrigatórios membership, disponibilidade dos módulos e grants ativos com escopo compatível. Um administrador não recebe linhas artificiais em `organization_permission_grants`; a atribuição do papel canônico e a sincronização de grants globais permanecem no mecanismo estabelecido. A consulta no banco em cada operação garante que mudanças de papel têm efeito sem reautenticar e que novas organizações e projetos existentes podem ser alcançados sem provisionamento manual de grants locais.

A comparação com os padrões relevantes de `cplug-scraper` está em [comparison-cplug-scraper.md](comparison-cplug-scraper.md). O ITES preserva sua estrutura relacional própria e aplica a autoridade administrativa central porque seus escopos de organização/projeto não possuem associação global automática.

## Edição da página pública

A página pública `/` consulta `GET /api/ites/pages/inicio` e renderiza o documento publicado no modelo de páginas existente. Com sessão válida e permissões `builder.access` e `builder.pages.edit`, o cabeçalho apresenta **Editar página inicial**. O seletor no editor apresenta o slug `inicio` como **Página inicial do ITES**.

O editor existente persiste rascunhos em `institutional_page_versions`, com controle de revisão otimista. A coluna `institutional_pages.published_version_id` referencia a versão pública ativa. Salvar rascunho não altera essa referência; publicar exige `builder.pages.publish` e atualiza a versão servida aos visitantes. A API valida blocos, propriedades e links antes de persistir. Usuários sem permissão não podem salvar nem publicar, mesmo que tentem chamar os endpoints diretamente. Detalhes do fluxo estão em [integration.md](../builder/integration.md).

## Evidências executadas em 19/11/2026

O Compose local foi reconstruído e atualizado por `docker compose up -d --build`. Os três serviços (`web`, `server` e `postgres`) ficaram saudáveis. Os testes integrados abaixo usam PostgreSQL 16 com Testcontainers, e os testes de navegador usaram a aplicação executando em `http://localhost:3000` com a conta administrativa configurada no ambiente, sem registrar credenciais ou tokens.

### Autorização

`OrganizationPermissionFlowTests` passou com 11 testes. O novo cenário cria um administrador sem membership e sem grants locais na organização, cria um projeto após essa atribuição e verifica:

- O administrador lista a organização e consulta seu catálogo de funcionalidades.
- `ORGANIZATION_AUDIT_READ` é autorizado e o endpoint de auditoria responde 200.
- O administrador consulta a caixa de revisões, visualiza solicitação pendente, é indicado como autorizado a decidir e aprova a solicitação pelo endpoint; o registro persiste `APPROVED` com seu identificador como aprovador.
- O administrador cria um projeto após sua atribuição e acessa projetos em outra organização; uma referência de projeto não é autorizada quando combinada com a organização errada.
- Um usuário regular continua sem ler auditoria, caixa de revisão ou projeto sem membership/grants.
- Uma nova permissão global inserida após o provisionamento é associada pelo trigger V24 ao papel `ADMINISTRATOR`.

No ambiente Compose, o login do administrador funcionou, `/api/organizations` respondeu 200, `/api/organizations/{id}/audit-events` respondeu 200, `/api/publication/review-requests` respondeu 200 e `/api/ites/me/permissions` continha `builder.access`, `builder.pages.edit` e `builder.pages.publish`. O navegador abriu a tela **Revisões**, carregou a consulta com HTTP 200 e apresentou o estado vazio sem mensagem de falta de autoridade. A caixa estava sem solicitações pendentes no banco local; a decisão positiva foi exercitada no teste integrado com uma solicitação criada para esse fim.

### Página inicial

O fluxo de navegador autenticado produziu os seguintes resultados:

```json
{"login":"OK","organizationList":200,"audit":200,"reviews":200,"grants":"OK","draftPersistence":"OK","unpublishedIsolation":"OK","publicPublication":"OK","unauthorizedEditor":"OK","restoredOriginalPage":"OK"}
```

O administrador abriu o editor pelo link apresentado no portal, selecionou a página inicial, alterou o título e salvou. Após recarregar, o rascunho foi recuperado; a rota pública manteve o título publicado anterior. Após publicar, a rota `/` apresentou o título atualizado. Um rascunho posterior não alterou a página pública. A versão original foi então restaurada e publicada. A leitura final da API retornou HTTP 200, revisão 13, e confirmou o título institucional original. Em contexto isolado sem sessão, a rota do editor redirecionou para autenticação e a API de rascunho respondeu HTTP 401.

Uma segunda sessão de navegador autenticada adicionou um bloco, moveu-o para cima e para baixo, removeu-o, salvou o documento, recarregou o editor e confirmou que a estrutura persistida permaneceu íntegra. Em seguida, restaurou a versão publicada como rascunho, sem mudar a página ativa. Resultado registrado: `{"addBlock":"OK","reorderBlock":"OK","removeBlock":"OK","saveAndReload":"OK","restorePublishedAsDraft":"OK"}`.

O fluxo HTTP de persistência e publicação também está coberto por `ItesFlowTests.institutionalPageRequiresGrantsAndPublishesSavedDocument`, inclusive negação de edição e publicação para usuário sem grants.

## Reexecução

1. Configure as variáveis descritas em `.env.example` e inicie a aplicação com `docker compose up -d --build`.
2. Execute `./mvnw -Dtest=OrganizationPermissionFlowTests,ItesFlowTests test -B` no diretório `server/` com Docker disponível para Testcontainers.
3. Autentique-se com o administrador e repita a sequência de rascunho, recarga, publicação e leitura pública descrita nesta página.
4. Confirme que o título publicado voltou ao conteúdo institucional original após a validação.

O teste real do Compose usa a base persistente local; a suíte Testcontainers cria bases descartáveis. A evidência aqui registra o ambiente e os resultados observados, sem afirmar uma implantação em VPS.
