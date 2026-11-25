/** Métodos HTTP utilizados pela API de autenticação. */
export type AuthHttpMethod = "GET" | "POST" | "PUT" | "DELETE"

/** Comprovação de identidade para o desafio de autenticação em duas etapas. */
export type TwoFactorProof = { code: string } | { recoveryCode: string }

/** Dados necessários para finalizar o cadastro de um usuário. */
export type SignupDetails = {
  token: string
  firstName: string
  lastName: string
  password: string
  acceptTerms: boolean
}

/** Dados necessários para alterar a senha da conta. */
export type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
  code?: string
}

/** Dados necessários para solicitar a alteração do e-mail. */
export type ChangeEmailPayload = {
  newEmail: string
  currentPassword: string
  code?: string
}

/** Credenciais necessárias para excluir a conta. */
export type DeleteAccountPayload = {
  password: string
  code?: string
}

/** Estrutura esperada para erros retornados pela API. */
export type AuthProblem = {
  code?: string
  message?: string
}

/** Opções adicionais para requisições de autenticação. */
export type AuthRequestOptions = {
  headers?: Record<string, string>
}

export type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export type AccessGrant = {
  accessToken: string
  expiresIn: number
  userId?: string
}

export type LoginOutcome =
  | AccessGrant
  | { 
        twoFactorRequired: true; 
        challenge: string; 
        expiresInSeconds: number 
    }

export type BrowserAccount = {
  userId: string
  firstName: string
  lastName: string
  email: string
  active: boolean
}

export type AuthSession = {
  id: string
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  userAgent: string
  ip: string
  current: boolean
}

export type TwoFactorStatus = {
  enabled: boolean
  enabledAt: string | null
  recoveryCodesRemaining: number
}

export type TwoFactorSetup = { 
    uri: string; 
    secret: string 
}

export type RecoveryCodes = { 
    codes: string[]; 
    enabledAt: string 
}
