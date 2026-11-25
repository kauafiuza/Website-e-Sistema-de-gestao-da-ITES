import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  authApi,
  isTwoFactorChallenge,
} from "@/services/auth/auth.service"
import type { AccessGrant, AuthUser, LoginOutcome } from "@/types/auth/auth.types"

type AuthState = {
  user: AuthUser | null
  grant: AccessGrant | null
  ready: boolean
}
type AuthContextValue = {
  user: AuthUser | null
  ready: boolean
  login: (email: string, password: string) => Promise<LoginOutcome>
  loginTwoFactor: (
    challenge: string,
    proof: { code: string } | { recoveryCode: string }
  ) => Promise<void>
  completeSignup: (details: {
    token: string
    firstName: string
    lastName: string
    password: string
    acceptTerms: boolean
  }) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<LoginOutcome>
  acceptGrant: (grant: AccessGrant) => Promise<void>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  switchAccount: (userId: string) => Promise<void>
  clearSession: () => void
  accessToken: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)
let initialRefresh: Promise<AccessGrant> | null = null

function restoreSession() {
  // Compartilha a primeira renovação entre as duas montagens do StrictMode.
  if (!initialRefresh) {
    initialRefresh = authApi.refresh().finally(() => {
      initialRefresh = null
    })
  }
  return initialRefresh
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    grant: null,
    ready: false,
  })

  const accept = useCallback(async (grant: AccessGrant) => {
    const user = await authApi.currentUser(grant.accessToken)
    setState({ user, grant, ready: true })
  }, [])

  useEffect(() => {
    let active = true
    restoreSession()
      .then(fetchCurrentUserForGrant)
      .then(({ user, grant }) => {
        if (active) setState({ user, grant, ready: true })
      })
      .catch(() => {
        if (active) setState({ user: null, grant: null, ready: true })
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!state.grant) return
    // Renova antes da expiração. O cookie HttpOnly é enviado automaticamente.
    let active = true
    const delay = Math.max(1_000, (state.grant.expiresIn - 30) * 1_000)
    const timer = window.setTimeout(() => {
      authApi
        .refresh()
        .then(async (grant) => {
          const result = await fetchCurrentUserForGrant(grant)
          if (active) setState({ ...result, ready: true })
        })
        .catch(() => {
          if (active) setState({ user: null, grant: null, ready: true })
        })
    }, delay)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [state.grant])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password)
      if (!isTwoFactorChallenge(result)) await accept(result)
      return result
    },
    [accept]
  )

  const loginTwoFactor = useCallback(
    async (
      challenge: string,
      proof: { code: string } | { recoveryCode: string }
    ) => {
      await accept(await authApi.loginTwoFactor(challenge, proof))
    },
    [accept]
  )

  const completeSignup = useCallback(
    async (details: {
      token: string
      firstName: string
      lastName: string
      password: string
      acceptTerms: boolean
    }) => {
      await accept(await authApi.signupComplete(details))
    },
    [accept]
  )

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      const result = await authApi.resetPassword(token, password)
      if (!isTwoFactorChallenge(result)) await accept(result)
      return result
    },
    [accept]
  )

  const logout = useCallback(async () => {
    const result = await authApi.logout()
    if (result.nextAccount) {
      try {
        await accept(await authApi.refresh())
        return
      } catch {
        /* Sessão remanescente expirada. */
      }
    }
    setState({ user: null, grant: null, ready: true })
  }, [accept])

  const logoutAll = useCallback(async () => {
    await authApi.logoutAll()
    setState({ user: null, grant: null, ready: true })
  }, [])

  const switchAccount = useCallback(
    async (userId: string) => {
      await accept(await authApi.switchAccount(userId))
    },
    [accept]
  )

  const clearSession = useCallback(
    () => setState({ user: null, grant: null, ready: true }),
    []
  )

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user: state.user,
        ready: state.ready,
        login,
        loginTwoFactor,
        completeSignup,
        resetPassword,
        acceptGrant: accept,
        logout,
        logoutAll,
        switchAccount,
        clearSession,
        accessToken: state.grant?.accessToken ?? null,
      },
    },
    children
  )
}

async function fetchCurrentUserForGrant(grant: AccessGrant) {
  return { grant, user: await authApi.currentUser(grant.accessToken) }
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
