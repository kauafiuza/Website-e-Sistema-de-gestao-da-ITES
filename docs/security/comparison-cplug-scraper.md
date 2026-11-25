# Comparação de autorização com o cplug-scraper

## Objetivo e escopo

Este documento registra a inspeção do sistema de autorização do `cplug-scraper` no workspace e compara seus padrões com o ITES. O repositório de referência foi localizado como projeto irmão de `ites-manage-system` no workspace compartilhado. O código é usado somente como referência arquitetural; não há dependência entre aplicações.

## Arquiteturas observadas

| Aspecto | ITES antes desta evolução | cplug-scraper | Diretriz para o ITES |
|---|---|---|---|
| Persistência | PostgreSQL com `app_roles`, `app_permissions`, `app_user_roles` e `app_role_permissions`; autorização adicional por escopo organizacional | PostgreSQL com `auth_roles`, `auth_permissions`, associações de usuário/papel e papel/permissão | Manter os nomes, o modelo relacional e os escopos existentes no ITES |
| Resolução | `ItesAccessService` consulta as associações do banco em cada operação protegida; grants organizacionais eram avaliados separadamente e exigiam membership | Serviço de autenticação hidrata papéis e permissões da sessão; middleware exige permissão no servidor | Manter resolução ITES no servidor e consultar o papel canônico antes dos grants organizacionais, sem confiar em permissões enviadas pelo cliente |
| Rotas | Controladores ITES chamam `require` para grants administrativos | Rotas aplicam middleware `requirePermission` | Exigir grants no backend, inclusive em agregações e exportações |
| Interface | `/ites/me/permissions` fornece grants efetivos; páginas condicionam ações e navegação | Sessão autenticada inclui grants; rotas e navegação usam `hasPermission` | Usar os grants efetivos para apresentação, mantendo validação de servidor |
| Provisionamento | `InitialAdministratorProvisioner` associa a conta configurada ao papel `ADMINISTRATOR`; V23 atribuía apenas os grants existentes naquele momento | `bootstrap-admin.cjs` serializa o primeiro provisionamento com lock transacional; a migration inicial atribui as permissões presentes ao papel `admin` | Preservar o provisionador ITES e tornar a sincronização de permissões idempotente no banco |
| Grants futuros | V24 associa grants globais futuros ao papel, mas isso não abrangia grants organizacionais nem membership em novos tenants | Novas permissões posteriores também exigem associação explícita em migrations | Preservar o gatilho global de V24 e resolver grants organizacionais do administrador no serviço central, com validação de propriedade do recurso |

## Padrões úteis observados no cplug-scraper

- Associação explícita entre usuários, papéis e permissões, sem confiar em um nome de papel enviado pelo navegador.
- Middleware no backend para validar cada ação protegida.
- Permissões efetivas obtidas de associações persistidas.
- Provisionamento transacional do administrador e proteção contra duas inicializações concorrentes.
- Validação de concessões para impedir que um gestor atribua capacidades que não possui.

## Adaptação adotada

O ITES conserva `ItesAccessService`, `app_roles`, `app_permissions` e o fluxo de concessões existente. A migration V24 associa ao papel `ADMINISTRATOR` todas as permissões globais atuais e um gatilho associa automaticamente cada nova permissão global inserida ao mesmo papel. O provisionador `InitialAdministratorProvisioner` mantém a atribuição do papel canônico a contas administrativas existentes e iniciais.

## Correção das falhas de autorização

Os erros de `Revisões` e `ORGANIZATION_AUDIT_READ` tinham a mesma causa de arquitetura: `OrganizationAuthorizationService` exigia membership ativo, disponibilidade do módulo e um grant explícito local antes de consultar qualquer autoridade global. O papel `ADMINISTRATOR` concedia somente grants da aplicação e não criava memberships/grants para organizações e projetos existentes ou futuros. Não havia claims de autorização no JWT nem cache de permissão que explicasse a rejeição.

A correção adapta o princípio de autorização de servidor usado pelo sistema de referência: o serviço central consulta no banco se o usuário ativo possui o papel canônico `ADMINISTRATOR` em cada decisão de escopo. Administradores podem operar em organizações e recursos existentes sem grants locais, inclusive em organizações e projetos criados posteriormente. A checagem valida a existência e o pertencimento do recurso à organização informada antes de permitir a ação. A listagem e o catálogo de funcionalidades incluem todas as organizações apenas para esse papel. Não são criados grants locais artificiais, e nenhum usuário comum recebe bypass; para os demais, membership, módulo habilitado e cadeia de concessões continuam obrigatórios.

Assim, `ORGANIZATION_AUDIT_READ` e `PUBLICATION_APPROVE` são efetivos para o administrador por resolução central de autoridade. A caixa de revisões continua restrita às solicitações pendentes da organização selecionada e as operações de decisão ainda aplicam suas regras de negócio, inclusive a proibição de aprovar a própria solicitação.

## Validação de regressão

`OrganizationPermissionFlowTests.systemAdministratorCanReviewAndAuditAcrossOrganizationsWithoutScopedGrants` executa os endpoints autenticados: lista de organizações e funcionalidades, auditoria, leitura da caixa de revisões e decisão de aprovação. O caso cria o administrador sem membership/grants na organização, confirma que `ORGANIZATION_AUDIT_READ` resolve e valida que usuário regular continua sem acesso. Também insere uma permissão global após a inicialização e verifica sua associação automática ao papel `ADMINISTRATOR` pelo gatilho V24.

O teste `OrganizationPermissionFlowTests` foi executado em PostgreSQL 16/Testcontainers: 11 testes, sem falhas. A validação de interação visual da edição e publicação da página inicial está registrada separadamente no estado de implementação após sua execução.

## Limites da comparação

A comparação cobre RBAC, validação de rotas, entrega dos grants à interface e provisionamento inicial. Lógica de scraping, lojas, execuções, logs e outras regras de negócio do repositório de referência não se aplicam ao ITES e não são reutilizadas.
