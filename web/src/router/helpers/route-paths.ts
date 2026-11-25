/**
 * Centraliza os caminhos de navegação da aplicação.
 *
 * As rotas são declaradas com `as const` para preservar seus
 * valores literais e impedir reatribuições pelo TypeScript.
 */
export const webPaths = {
  auth: "/auth",
  login: "/entrar",
  signup: "/cadastro",
  signupConfirm: "/cadastro/confirmar",

  forgotPassword: "/esqueci-senha",
  resetPassword: "/redefinir-senha",
  emailConfirm: "/conta/email/confirmar",

  accountSettings: "/conta/configuracoes",

  editor: "/editor",
  preview: "/preview",
  projects: "/projects",
  publications: "/publications",
  publicationReviewInbox: "/publication/reviews",
  publicationDetails: "/publications/:projectId",
  organizationMembers: "/organizations/members",
  organizationAudit: "/organizations/audit",
  acceptOrganizationInvitation: "/convite/aceitar",
  themes: "/themes",
} as const

/**
 * Rotas de autenticação que não devem ser utilizadas como
 * destino de retorno após a conclusão do login.
 *
 * Evita redirecionamentos para o próprio fluxo de autenticação.
 */
const AUTH_RETURN_BLOCKED_PATHS: readonly string[] = [
  webPaths.auth,
  webPaths.login,
  webPaths.signup,
  webPaths.signupConfirm,
  webPaths.forgotPassword,
  webPaths.resetPassword,
  webPaths.emailConfirm,
]

/**
 * Recupera uma rota de retorno válida após a autenticação.
 *
 * Valida o estado de navegação recebido pelo React Router e
 * impede retornos para rotas de autenticação ou caminhos externos.
 *
 * Quando disponível, preserva os parâmetros de busca e o fragmento
 * da URL original.
 *
 * @param state Estado de navegação contendo a propriedade `from`.
 * @returns URL de retorno validada ou a rota padrão de projetos.
 */
export function returnPath(state: unknown): string {
  if (
    typeof state !== "object" ||
    state === null ||
    !("from" in state)
  ) {
    return webPaths.projects
  }

  const from = state.from

  if (
    typeof from !== "object" ||
    from === null ||
    !("pathname" in from)
  ) {
    return webPaths.projects
  }

  const { pathname } = from

  const isValidPathname =
    typeof pathname === "string" &&
    pathname.startsWith("/") &&
    !pathname.startsWith("//")

  if (!isValidPathname) {
    return webPaths.projects
  }

  const isBlockedPath = AUTH_RETURN_BLOCKED_PATHS.includes(pathname)

  if (isBlockedPath) {
    return webPaths.projects
  }

  const search =
    "search" in from &&
    typeof from.search === "string" &&
    from.search.startsWith("?")
      ? from.search
      : ""

  const hash =
    "hash" in from &&
    typeof from.hash === "string" &&
    from.hash.startsWith("#")
      ? from.hash
      : ""

  return `${pathname}${search}${hash}`
}
