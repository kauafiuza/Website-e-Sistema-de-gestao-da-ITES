const API_AUTH = "/api/auth"
const API_AUTH_BROWSER = `${API_AUTH}/browser`
const API_PROJECTS = "/api/projects"

/**
 * Constrói a URL de um projeto a partir de seu identificador.
 *
 * @param id Identificador do projeto.
 * @returns Caminho do projeto com o identificador codificado.
 */
const projectPath = (id: string): string =>
  `${API_PROJECTS}/${encodeURIComponent(id)}`

/**
 * Mapeamento centralizado dos endpoints da aplicação.
 *
 * A estrutura é mantida como readonly por meio de `as const`,
 * preservando os tipos literais dos caminhos estáticos.
 */
export const apiPaths = {
  auth: {
    login: `${API_AUTH_BROWSER}/login`,
    loginTwoFactor: `${API_AUTH_BROWSER}/login/2fa`,
    refresh: `${API_AUTH_BROWSER}/refresh`,
    logout: `${API_AUTH_BROWSER}/logout`,
    logoutAll: `${API_AUTH_BROWSER}/logout/all`,

    accounts: `${API_AUTH_BROWSER}/accounts`,
    switchAccount: `${API_AUTH_BROWSER}/switch`,

    signupStart: `${API_AUTH_BROWSER}/signup/start`,
    signupResend: `${API_AUTH_BROWSER}/signup/resend`,
    signupVerify: `${API_AUTH_BROWSER}/signup/verify`,
    signupComplete: `${API_AUTH_BROWSER}/signup/complete`,

    forgotPassword: `${API_AUTH_BROWSER}/password/forgot`,
    resetVerify: `${API_AUTH}/password/reset/verify`,
    resetPassword: `${API_AUTH_BROWSER}/password/reset`,

    confirmEmail: `${API_AUTH}/email/confirm`,
    me: `${API_AUTH}/me`,
    sessions: `${API_AUTH}/account/sessions`,
    accountEmail: `${API_AUTH}/account/email`,
    accountPassword: `${API_AUTH}/account/password`,
    account: `${API_AUTH}/account`,

    twoFactor: `${API_AUTH}/account/2fa`,
  },

  /** Endpoint utilizado para listar e criar projetos. */
  projects: API_PROJECTS,
  organizations: "/api/organizations",
  organizationMembers: (id: string): string => `/api/organizations/${encodeURIComponent(id)}/members`,
  organizationInvitations: (id: string): string => `/api/organizations/${encodeURIComponent(id)}/invitations`,
  organizationInvitationAccept: "/api/organizations/invitations/accept",
  organizationInvitationLookup: "/api/organizations/invitations/lookup",
  organizationGrants: (id: string): string => `/api/organizations/${encodeURIComponent(id)}/grants`,
  organizationAuditEvents: (id: string): string => `/api/organizations/${encodeURIComponent(id)}/audit-events`,
  organizationFeatures: (id: string): string => `/api/organizations/${encodeURIComponent(id)}/features`,
  organizationTemplates: (id: string): string => `/api/organizations/${encodeURIComponent(id)}/templates`,
  themes: "/api/themes",

  /** Retorna o endpoint de um projeto específico. */
  project: (id: string): string => projectPath(id),

  projectRevisions: (id: string): string => `${projectPath(id)}/revisions`,
  projectRevisionRestore: (id: string, revisionId: string): string =>
    `${projectPath(id)}/revisions/${encodeURIComponent(revisionId)}/restore`,

  /** Retorna o endpoint utilizado para renomear um projeto. */
  projectName: (id: string): string => `${projectPath(id)}/name`,
} as const
