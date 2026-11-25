# Especificação de requisitos e rastreabilidade

## Contexto

A ITES, no IFRJ Campus Niterói, apoia grupos de economia solidária com assessoria, formação, eventos e parcerias. Esta especificação tem como fonte o [documento de referência da ITES](proposta-portal-e-sistema-de-gestao-ites.pdf) (*Proposta de Desenvolvimento do Portal Web e Sistema de Gestão da ITES*).

## Atores

Visitante, solicitante, analista de demandas, administrador, editor de conteúdo e publicador. O vínculo institucional (coordenador, professor colaborador, bolsista, voluntário) **não** concede permissão administrativa automaticamente. O conteúdo público só aparece depois de publicado; dados pessoais e operacionais são privados.

## Regras principais

- O solicitante se cadastra com nome, contato (e-mail ou WhatsApp) e senha, faz login, mantém seu perfil e pode enviar várias demandas.
- Em cada demanda, o solicitante informa sua **condição**: representante de empreendimento/grupo/coletivo, integrante de fórum, representante de instituição parceira ou outros (com descrição obrigatória). Quando for o caso, associa uma organização.
- Cada demanda recebe um **código único**, começa na situação **Pendente**, e o solicitante só acompanha as próprias demandas e decisões.
- O administrador filtra, classifica e decide as demandas, com permissão explícita e justificativa.
- O editor de conteúdo edita blocos permitidos, salva e recarrega rascunhos. A publicação é aprovada separadamente pelo publicador.
- O **setor econômico** da organização é diferente do **serviço solicitado** à ITES.

## Transições de situação da demanda

| De | Para |
|---|---|
| Pendente | Aceita para atendimento, Recusada ou Cancelada |
| Aceita para atendimento | Em atendimento ou Cancelada |
| Em atendimento | Concluída ou Cancelada |

Toda decisão registra responsável, data e justificativa. A conclusão exige uma nota de conclusão. Os motivos de recusa e cancelamento ficam guardados. A transição e o registro no histórico acontecem juntos (de forma atômica).

## Rastreabilidade

| ID | Requisito | Onde é atendido | Critério de aceite | Estado observado |
|---|---|---|---|
| M1 | Perfil, organização e condição por demanda | `/ites/organizations`, `/ites/demands` e telas do solicitante | associações de organização verificadas pelo servidor; condição gravada por demanda | Implementado; teste integrado cobre cadastro de demanda e vínculo |
| M2 | Demanda com código, serviço, urgência e situação Pendente | `DemandController`, `DemandService`, migração V23 e telas | código gerado e dados persistidos | Implementado e testado com PostgreSQL 16 |
| M3 | Autenticação, sessões e permissões | autenticação existente, `ItesAccessService`, papéis e grants | operação sem autenticação/permissão negada no servidor | Implementado; testes integrados e 401 verificado no Compose |
| M4 | Listar, filtrar, detalhar e classificar | `/ites/demands/review` e tela administrativa | filtro por situação e associações corretas | Implementado; testes de backend |
| M5 | Decisões e histórico | `DemandService.decide`, `demand_events` | responsável, data e motivo registrados; transição inválida falha | Implementado e testado com auditoria transacional |
| M6 | Acompanhamento das próprias demandas | `/ites/demands` e tela do solicitante | demanda de outro usuário inacessível | Implementado; teste de titularidade |
| M7 | Planejamento das atividades | evolução futura | extensão documentada | Futuro; não incluído no MVP |
| M8 | Relatórios | consultas acadêmicas | métricas conferidas | Parcial; consultas propostas existem, mas ainda precisam ser reconciliadas ao schema efetivo |
| M9 | Notificações | estado e decisões visíveis na área do solicitante | situação exibida ao solicitante | Parcial; confirmação interna implementada, e-mail transacional de status não incluído |
| P1 | Sete seções públicas e publicação | páginas institucionais e portal | somente versões publicadas aparecem publicamente | Implementado para estrutura de páginas; conteúdo de notícias/publicações ainda é estático |
| B1 | Editar, pré-visualizar, salvar, publicar e recarregar páginas | editor integrado e `/ites/pages` | versão persistida publicada e renderizada; operação protegida | Implementado para catálogo restrito; testes integrados cobrem gravação/publicação |
| G1 | Atribuição e revogação de papéis | tabelas de autorização e `/ites/roles`, `/ites/users` | autorização aplicada no backend | Implementado e testado |
| D1 | Modelo de dados e 20 registros por tabela | migrações Flyway e `database/coursework/` | contagens e chaves estrangeiras conferidas | Validado no schema acadêmico PostgreSQL 16: as 12 tabelas têm pelo menos 20 registros. Aplicação usa schema independente |
| D2 | 5 consultas simples, 3 com JOIN e 3 subconsultas | `database/coursework/03_queries.sql` | resultados registrados | 11 consultas executadas com saída real no schema acadêmico; falta reconciliar com as tabelas operacionais |
| D3 | 3 procedures, 3 functions e 3 triggers | `database/coursework/04_routines.sql` | testes positivos e negativos | 5 procedures, 3 functions e 3 triggers testados no modelo acadêmico; gatilho operacional de transição também foi testado |
| D4 | Papéis e privilégios do banco | `database/coursework/05_security.sql`, `07_security_tests.sql` e `08_provision_users.sql` | operações não permitidas são negadas | Grupos e quatro contas LOGIN testados em banco descartável; runtime do produto ainda usa conta proprietária |
| DOC | Dicionário de dados, imagem do modelo e evidências | `docs/database/` | schema acadêmico representado no modelo | Diagrama e dicionário refletem o modelo acadêmico; falta diagrama abrangente do schema operacional |
