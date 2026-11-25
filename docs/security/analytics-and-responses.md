# Consulta de respostas, indicadores e exportações

## Fontes de informação

O ITES mantém dois fluxos distintos. Demandas são registradas em `demands`, com solicitante, organização, serviço, descrição, urgência, situação e datas. As mudanças de situação e suas justificativas ficam em `demand_events`. Formulários de páginas publicadas de projetos são armazenados em `form_submissions`, com os valores enviados em `fields` e uma cópia do esquema original em `field_schema`. A cópia do esquema preserva a interpretação histórica mesmo que o formulário seja alterado depois.

Dados de cadastro, caracterização organizacional, respostas de publicação e classificações internas não são tratados como uma coleção única de respostas. A página de detalhes da publicação apresenta as respostas junto às perguntas originais e usa as permissões e os escopos de organização/projeto existentes. A busca opcional `search` na listagem e na exportação consulta o nome do formulário, os valores enviados e o esquema de perguntas; paginação e exportação mantêm o escopo do projeto e da organização. O painel ITES consulta as demandas e não amplia o acesso a formulários de outras organizações.

## Comparação de autorização

A comparação do RBAC com o projeto de referência está em [comparison-cplug-scraper.md](comparison-cplug-scraper.md). O ITES mantém `ItesAccessService` como autoridade no backend e as associações persistidas entre usuário, papel e permissão. A migration V24 atribui todos os grants registrados ao papel canônico `ADMINISTRATOR`; um gatilho associa também as permissões que forem cadastradas por migrations futuras. A migration V25 cadastra os grants de analytics, organizações, relatórios e configuração. Outros papéis não recebem esses grants automaticamente.

| Capacidade | Grant | Endpoint |
|---|---|---|
| Consultar agregações; registros identificáveis também exigem `demands.read` | `analytics.view` e, para detalhes, `demands.read` | `GET /ites/analytics/demands` |
| Gerenciar a composição do painel | `dashboards.manage` | `GET/PUT /ites/dashboards/demandas` (consulta também exige `analytics.view`) |
| Gerar detalhe e histórico de demanda | `reports.generate` | `GET /ites/reports/demands/{id}` |
| Exportar o resultado filtrado | `reports.export` | `GET /ites/reports/demands.csv` |

O backend exige cada concessão. CSV e relatório individual também exigem `demands.read`, além da concessão específica de exportação/geração. Um usuário que tenha apenas `analytics.view` recebe agregações sem linhas de pessoas; a busca textual, por poder consultar nomes e descrições, também exige `demands.read`. A interface consulta `/ites/me/permissions` para mostrar controles, mas ocultar um controle não substitui autorização no servidor.

## Consulta e filtros

`GET /ites/analytics/demands` aceita filtros opcionais `status`, `urgency`, `from`, `to` e `search`. O período usa datas ISO `AAAA-MM-DD`; quando os dois limites são informados, o fim precisa ser igual ou posterior ao início. A busca textual abrange código, descrição, nome do solicitante e nome da organização.

A resposta contém indicadores resumidos, agregações por situação, urgência, serviço e mês, e até 500 linhas recentes para a tabela administrativa. A exportação CSV aplica os mesmos filtros e limita o conjunto a 10 mil linhas. Células que possam ser interpretadas como fórmulas são neutralizadas. Dados pessoais aparecem apenas em endpoints que exigem permissões administrativas explícitas.

## Fontes de dados e visualizações

O construtor de painel oferece somente fontes enumeradas no servidor; ele não aceita SQL, nomes de tabela ou expressões enviados pelo navegador.

| Fonte | Conteúdo | Visualizações permitidas |
|---|---|---|
| `summary` | Total, pendentes, aceitas, recusadas e alta urgência | Indicador com métrica enumerada |
| `byStatus` | Contagem por situação | Barras, rosca ou tabela |
| `byUrgency` | Contagem por urgência | Barras, rosca ou tabela |
| `byService` | Contagem por serviço solicitado | Barras, rosca ou tabela |
| `byOrganizationSector` | Contagem de demandas por setor econômico associado | Barras, rosca ou tabela |
| `byMonth` | Volume de demandas por mês | Barras, linha ou tabela |

Cada painel permite título, inclusão, remoção e reordenação de até 20 blocos. O documento é validado por lista de fontes, visualizações e métricas permitidas. A configuração usa `institutional_pages` e `institutional_page_versions`, o mesmo armazenamento versionado de documentos institucionais. O slug `painel-demandas` não tem versão pública por padrão; visualizar e editar a configuração exige autorização. Os resultados são consultados em tempo real e não são copiados para o documento.

`GET /ites/organizations/admin` retorna organizações, setores econômicos, quantidade de integrantes e demandas associadas e exige `organizations.manage`. Nesta etapa, a capacidade implementada é de consulta administrativa; operações de criação e alteração de organizações permanecem nos fluxos existentes de cadastro e gestão de integrantes.

## Relatórios e formatos

- **CSV:** exporta demandas filtradas, com código, data, situação, urgência, serviço, solicitante, organização e descrição.
- **PDF:** a tela de indicadores e o relatório individual dispõem da impressão do navegador, permitindo selecionar “Salvar como PDF”. O documento usa o mesmo conjunto de dados carregado e mantém os filtros aplicados na consulta.
- **Relatório individual:** inclui dados da demanda e histórico de transições, com justificativas, responsáveis e datas. A visualização imprimível omite o e-mail do solicitante.
- **Respostas de formulários de projetos:** seguem a exportação CSV própria de `FormSubmissionService`, autorizada por escopo de organização/projeto. Não são incluídas no relatório geral de demandas.

## Limitações conhecidas

- O painel visualiza somente o modelo operacional de demandas. Métricas de questionários de publicações ainda não fazem parte de agregações cruzadas.
- PDF é produzido pelo mecanismo de impressão do navegador, não por uma biblioteca de renderização no servidor.
- O painel é persistido como documento privado versionado; não há link público/compartilhável de dashboard.
- A suíte de integração do backend usa Testcontainers e requer ambiente Java/Docker para executar; a validação deve registrar quando esse ambiente não estiver disponível.
