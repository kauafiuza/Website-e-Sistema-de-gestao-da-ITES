import { apiPaths } from "@/services/helpers/api-paths"

import type {
  AccessGrant,
  AuthHttpMethod,
  AuthProblem,
  AuthRequestOptions,
  AuthSession,
  AuthUser,
  BrowserAccount,
  ChangeEmailPayload,
  ChangePasswordPayload,
  DeleteAccountPayload,
  LoginOutcome,
  RecoveryCodes,
  SignupDetails,
  TwoFactorProof,
  TwoFactorSetup,
  TwoFactorStatus,
} from "@/types/auth/auth.types"
import type { PageResponse } from "@/types/api/pagination"
import { DEFAULT_AUTH_ERROR_MESSAGE } from "./utils/auth-messages"

/**
 * Representa uma resposta HTTP malsucedida da API de autenticação.
 *
 * Preserva o status HTTP e, quando disponíveis, o código e a
 * mensagem de erro fornecidos pelo backend.
 */
export class AuthRequestError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, code?: string, message?: string) {
    super(message || DEFAULT_AUTH_ERROR_MESSAGE)

    this.name = "AuthRequestError"
    this.status = status
    this.code = code
  }
}

/**
 * Executa uma requisição à API de autenticação.
 *
 * Utiliza credenciais da mesma origem, permite autenticação Bearer
 * opcional e centraliza o tratamento de respostas e erros HTTP.
 *
 * @template T Tipo esperado para a resposta.
 * @param url Endpoint da requisição.
 * @param method Método HTTP utilizado.
 * @param body Dados opcionais enviados como JSON.
 * @param accessToken Token Bearer, quando exigido pelo endpoint.
 * @param options Configurações adicionais da requisição.
 * @returns Dados retornados pela API ou undefined para respostas vazias.
 * @throws {AuthRequestError} Quando a resposta HTTP não é bem-sucedida.
 */
async function request<T>(
  url: string,
  method: AuthHttpMethod = "POST",
  body?: object,
  accessToken?: string,
  options: AuthRequestOptions = {},
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as
      | AuthProblem
      | null

    throw new AuthRequestError(
      response.status,
      problem?.code,
      problem?.message,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const content = await response.text()

  return content ? (JSON.parse(content) as T) : (undefined as T)
}

/**
 * Operações de autenticação, cadastro, recuperação de acesso,
 * gerenciamento de sessões, conta e verificação em duas etapas.
 */
export const authApi = {

  /** Renova as credenciais de acesso da sessão atual. */
  refresh: (): Promise<AccessGrant> =>
    request<AccessGrant>(apiPaths.auth.refresh),

  /** Autentica um usuário utilizando e-mail e senha. */
  login: (email: string, password: string): Promise<LoginOutcome> =>
    request<LoginOutcome>(apiPaths.auth.login, "POST", {
      email,
      password,
    }),

  /**
   * Finaliza o login mediante um desafio de autenticação em duas etapas.
   *
   * Aceita um código temporário ou um código de recuperação.
   */
  loginTwoFactor: (
    challenge: string,
    proof: TwoFactorProof,
  ): Promise<AccessGrant> =>
    request<AccessGrant>(apiPaths.auth.loginTwoFactor, "POST", {
      challenge,
      ...proof,
    }),

  /** Inicia o cadastro e solicita a verificação do e-mail. */
  signupStart: (
    email: string,
  ): Promise<{ resendAvailableAt: string }> =>
    request(apiPaths.auth.signupStart, "POST", { email }),

  /** Reenvia a solicitação de verificação do cadastro. */
  signupResend: (
    email: string,
  ): Promise<{ resendAvailableAt: string }> =>
    request(apiPaths.auth.signupResend, "POST", { email }),

  /** Valida o token de verificação do cadastro. */
  signupVerify: (token: string): Promise<{ email: string }> =>
    request(apiPaths.auth.signupVerify, "POST", { token }),

  /** Finaliza o cadastro com os dados pessoais e a senha. */
  signupComplete: (details: SignupDetails): Promise<AccessGrant> =>
    request<AccessGrant>(
      apiPaths.auth.signupComplete,
      "POST",
      details,
    ),

  /** Solicita o processo de recuperação de senha. */
  forgotPassword: (email: string): Promise<void> =>
    request<void>(apiPaths.auth.forgotPassword, "POST", { email }),

  /** Valida o token utilizado na recuperação de senha. */
  resetVerify: (token: string): Promise<{ email: string }> =>
    request(apiPaths.auth.resetVerify, "POST", { token }),

  /** Define uma nova senha utilizando um token de recuperação. */
  resetPassword: (
    token: string,
    password: string,
  ): Promise<LoginOutcome> =>
    request<LoginOutcome>(apiPaths.auth.resetPassword, "POST", {
      token,
      password,
    }),

  /** Confirma o endereço de e-mail utilizando um token de validação. */
  confirmEmail: (token: string): Promise<{ email: string }> =>
    request(apiPaths.auth.confirmEmail, "POST", { token }),

  /** Retorna os dados do usuário autenticado. */
  currentUser: (accessToken: string): Promise<AuthUser> =>
    request<AuthUser>(
      apiPaths.auth.me,
      "GET",
      undefined,
      accessToken,
    ),

  /** Encerra a sessão atual. */
  logout: (): Promise<{ nextAccount: boolean }> =>
    request(apiPaths.auth.logout),

  /** Encerra todas as sessões vinculadas ao usuário. */
  logoutAll: (): Promise<void> =>
    request<void>(apiPaths.auth.logoutAll),

  /**
   * Lista as contas disponíveis no contexto do navegador.
   *
   * Utiliza o cabeçalho X-Requested-With exigido por esta operação.
   */
  accounts: (): Promise<BrowserAccount[]> =>
    request<BrowserAccount[]>(
      apiPaths.auth.accounts,
      "GET",
      undefined,
      undefined,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    ),

  /** Alterna para outra conta disponível no navegador. */
  switchAccount: (userId: string): Promise<AccessGrant> =>
    request<AccessGrant>(
      apiPaths.auth.switchAccount,
      "POST",
      { userId },
    ),

  /** Lista as sessões ativas do usuário autenticado. */
  sessions: (token: string, page = 0, size = 10): Promise<PageResponse<AuthSession>> =>
    request<PageResponse<AuthSession>>(
      `${apiPaths.auth.sessions}?page=${page}&size=${size}`,
      "GET",
      undefined,
      token,
    ),

  /** Revoga uma sessão específica pelo seu identificador. */
  revokeSession: (token: string, id: string): Promise<void> =>
    request<void>(
      `${apiPaths.auth.sessions}/${encodeURIComponent(id)}`,
      "DELETE",
      undefined,
      token,
    ),

  /** Revoga todas as sessões, exceto a sessão atual. */
  revokeOtherSessions: (token: string): Promise<void> =>
    request<void>(
      `${apiPaths.auth.sessions}?scope=others`,
      "DELETE",
      undefined,
      token,
    ),

  /**
   * Altera a senha da conta.
   *
   * Permite informar um código de verificação quando necessário.
   */
  changePassword: (
    token: string,
    body: ChangePasswordPayload,
  ): Promise<AccessGrant> =>
    request<AccessGrant>(
      apiPaths.auth.accountPassword,
      "PUT",
      body,
      token,
    ),

  /**
   * Solicita a alteração do endereço de e-mail.
   *
   * Exige a senha atual e aceita um código adicional de verificação.
   */
  changeEmail: (
    token: string,
    body: ChangeEmailPayload,
  ): Promise<void> =>
    request<void>(
      apiPaths.auth.accountEmail,
      "POST",
      body,
      token,
    ),

  /** Exclui a conta mediante confirmação das credenciais. */
  deleteAccount: (
    token: string,
    body: DeleteAccountPayload,
  ): Promise<void> =>
    request<void>(
      apiPaths.auth.account,
      "DELETE",
      body,
      token,
    ),

  /** Consulta o status da autenticação em duas etapas. */
  twoFactorStatus: (token: string): Promise<TwoFactorStatus> =>
    request<TwoFactorStatus>(
      apiPaths.auth.twoFactor,
      "GET",
      undefined,
      token,
    ),

  /** Inicia a configuração da autenticação em duas etapas. */
  twoFactorStart: (
    token: string,
    password: string,
  ): Promise<TwoFactorSetup> =>
    request<TwoFactorSetup>(
      `${apiPaths.auth.twoFactor}/start`,
      "POST",
      { password },
      token,
    ),

  /** Confirma a configuração 2FA e retorna os códigos de recuperação. */
  twoFactorConfirm: (
    token: string,
    code: string,
  ): Promise<RecoveryCodes> =>
    request<RecoveryCodes>(
      `${apiPaths.auth.twoFactor}/confirm`,
      "POST",
      { code },
      token,
    ),

  /**
   * Regenera os códigos de recuperação da autenticação em duas etapas.
   *
   * Exige confirmação por senha e código de verificação.
   */
  twoFactorRegenerate: (
    token: string,
    password: string,
    code: string,
  ): Promise<RecoveryCodes> =>
    request<RecoveryCodes>(
      `${apiPaths.auth.twoFactor}/recovery-codes`,
      "POST",
      { password, code },
      token,
    ),

  /** Desativa a autenticação em duas etapas da conta. */
  twoFactorDisable: (
    token: string,
    password: string,
    code: string,
  ): Promise<void> =>
    request<void>(
      apiPaths.auth.twoFactor,
      "DELETE",
      { password, code },
      token,
    ),
}

/**
 * Verifica se o resultado do login exige autenticação em duas etapas.
 *
 * Atua como type guard, permitindo que o TypeScript identifique
 * a variante de LoginOutcome que contém o desafio 2FA.
 *
 * @param value Resultado retornado pela operação de login.
 * @returns true quando o login exige verificação adicional.
 */
export function isTwoFactorChallenge(
  value: LoginOutcome,
): value is Extract<LoginOutcome, { twoFactorRequired: true }> {
  return (
    "twoFactorRequired" in value &&
    value.twoFactorRequired === true
  )
}
