# Estado de implementação da plataforma ITES

Atualizado em 19/11/2026. Este documento registra a correção de autorização administrativa por escopo e a descoberta do editor da landing page pública.

## Arquitetura atual

O repositório mantém frontend React/TypeScript/Vite em `web/`, backend Java/Spring Boot em `server/`, scripts relacionais e acadêmicos em `database/` e documentação em `docs/`. O PostgreSQL é a fonte de persistência. Flyway em `server/src/main/resources/db/migration/` é o único fluxo de migração operacional.

A interface combina o portal institucional, jornadas autenticadas e administração. O editor de páginas compartilha identidade, autorização e persistência com a API. A administração de concessões é aplicada no backend. O documento visual é validado e não executa código arbitrário.

## Funcionalidades disponíveis

- Login, sessão e gestão de conta; cadastro público por e-mail opcional; provisionamento administrativo sem dependência de e-mail.
- Provisionamento do primeiro administrador por variáveis de ambiente, com e-mail marcado como verificado e sem segundo fator obrigatório.
- Organizações, membros, papéis e permissões explícitas.
- Criação, classificação, decisão e acompanhamento de demandas com histórico.
- Páginas institucionais com versões de rascunho, prévia, publicação e retirada do ar.
- Landing page inicial representada por documento versionado e publicado; quando o sistema é inicializado com administrador e sem versão pública, `InstitutionalHomeProvisioner` publica o recurso `ites-homepage.json`.
- Editor institucional reutiliza o catálogo e o `PropertyEditor` já integrados, com adição, remoção, reordenação, edição de propriedades, prévia e recuperação da versão publicada como rascunho.
- Papel `ADMINISTRATOR` recebe os grants cadastrados e grants futuros por trigger da migration V24; a V25 cadastra concessões analíticas e os demais papéis mantêm acesso explícito.
- A autoridade do administrador é resolvida pelo papel persistido em cada operação de escopo organizacional. O bypass central não depende de JWT/cache e valida que a organização e cada projeto/tema consultados pertencem ao escopo informado. Usuários sem esse papel continuam sujeitos a membership, disponibilidade de módulo e grants explícitos.
- Administradores autenticados com grants do editor veem **Editar página inicial** no cabeçalho do portal público; o seletor identifica a página `inicio` como **Página inicial do ITES**. Publicação e edição continuam validadas no backend.
- Painel privado de demandas com filtros, indicadores, gráficos/tabelas configuráveis e persistência versionada no mesmo modelo de páginas, com grants dedicados.
- Relatórios individuais com histórico, exportação CSV filtrada e impressão do navegador para salvar como PDF.
- Respostas de formulários de projetos continuam consultáveis a partir da página da publicação, preservando a versão histórica do esquema e o controle por escopo organizacional/projeto.
- Compose com serviços web, API e PostgreSQL, volume persistente e verificações de saúde.
- Pipeline GitHub Actions com verificações de frontend, backend, imagens e execução de smoke tests.

## Validações registradas

- Frontend: `npm run typecheck`, `npm test` (50 testes), `npm run lint` e `npm run build` concluíram com sucesso. O Vite ainda emite um aviso de tamanho para os bundles `blocks` e `export` acima de 500 kB.
- Backend: `./mvnw clean test -B` executado em contêiner JDK com Docker/Testcontainers: 44 testes, sem falhas. Uma execução adicional de `./mvnw -Dtest=ItesFlowTests,ProjectFlowTests test -B` validou 25 testes, sem falhas, incluindo concessões futuras, filtros autorizados e auditoria de respostas.
- Migrações V24–V26: aplicadas com sucesso em bancos PostgreSQL 16 limpos nos testes integrados. A sincronização de permissões atuais/futuras, o catálogo analítico e a página privada do painel foram exercitados.
- Regressão administrativa em `OrganizationPermissionFlowTests`: 11 testes passaram. O administrador sem membership ou grants locais consultou a auditoria, recebeu organizações e funcionalidades, criou e acessou projetos em mais de uma organização, listou revisão pendente e a aprovou; a combinação de projeto com organização incorreta não foi autorizada e o usuário comum permaneceu bloqueado. Uma permissão global criada após o provisionamento foi associada ao papel pelo gatilho V24.
- Fluxo HTTP da edição da página inicial é coberto por `ItesFlowTests.institutionalPageRequiresGrantsAndPublishesSavedDocument`, incluindo rascunho, persistência, publicação pública e negação a usuário sem grant. A validação Playwright no Compose também passou: login real, link do editor no portal, adição/remoção/reordenação de blocos, persistência após recarga, isolamento entre rascunho e versão pública, publicação visível na rota `/`, restauração da versão publicada e negação de edição sem sessão. A versão original foi restaurada e sua leitura pública final confirmou HTTP 200 e revisão 13.
- A tela administrativa `Revisões` foi aberta pelo navegador autenticado e exibiu o estado vazio esperado sem erro de autoridade. A API de caixa de entrada e o endpoint de auditoria responderam HTTP 200 para a conta administrativa. A decisão de uma solicitação pendente foi validada pela suíte integrada, pois a base local não continha solicitações pendentes.
- Compose: `docker compose config --quiet`, `docker compose build server web` e `docker compose up -d --build` concluíram sem erros. Os três serviços estão saudáveis. A rota pública do portal e a API da página inicial responderam HTTP 200; o painel foi confirmado como privado (rota institucional HTTP 404 e API sem autenticação HTTP 401).
- Banco do Compose local: Flyway está na versão V26; o papel `ADMINISTRATOR` possui 17 de 17 permissões cadastradas; a página `inicio` está publicada com sete blocos e o registro do painel privado existe. A verificação não exibiu dados pessoais nem credenciais.
- Banco acadêmico: consultas, procedures, functions, triggers, constraints e perfis foram executados em PostgreSQL 16 dedicado; os resultados estão na pasta de evidências do banco.

As validações anteriores desta seção foram realizadas em 18/11/2026; a regressão administrativa e o fluxo de navegador foram executados em 19/11/2026, conforme [evidências](security/admin-and-landing-validation.md). O build do backend no Dockerfile compila e empacota, mas não executa a suíte; os testes foram executados separadamente com Testcontainers. O ambiente de desenvolvimento em `http://localhost:3000` foi atualizado e permaneceu saudável após a recriação.

## Limitações e riscos

1. O conteúdo de notícias, eventos, biblioteca e publicações ainda é parcialmente estático; as páginas institucionais versionadas são editáveis.
2. A publicação em Dokploy/VPS ainda não foi executada neste ambiente.
3. As credenciais operacionais do banco ainda precisam ser segregadas das credenciais que aplicam migrações antes de produção.
4. Os scripts acadêmicos e o diagrama ainda não representam o esquema operacional completo.
5. A proteção obrigatória da branch depende de configuração no GitHub e da execução do workflow no remoto.
6. O cadastro público por link e as notificações dependem de provedor de e-mail; contas criadas pela administração não dependem desse serviço.
7. O documento de referência da ITES está em `docs/requirements/`; o modelo de documento do professor ainda não foi disponibilizado.

## Próximos passos

1. Executar testes reais de navegador para consulta de respostas, painel e impressão em PDF.
2. Executar a pipeline no GitHub e configurar as verificações obrigatórias da branch protegida.
3. Completar a reconciliação do modelo acadêmico com o esquema operacional.
4. Separar credenciais de banco para migração e runtime antes da implantação de produção.
5. Preparar domínio, HTTPS, backups e segredos no Dokploy; nenhuma publicação em VPS foi executada.

## Limitações desta evolução

- O relatório em PDF usa a impressão do navegador e não é gerado no servidor.
- As visualizações analíticas agregam demandas. Respostas de formulários de projetos seguem suas páginas e autorizações atuais, sem agregação entre organizações.
- Os dashboards persistidos são privados e versionados; ainda não há compartilhamento público.
- A consulta administrativa apresenta até 500 demandas recentes; CSV está limitado a 10 mil registros por solicitação.
