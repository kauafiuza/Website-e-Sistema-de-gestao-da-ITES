import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  listOrganizationFeatures,
  listOrganizations,
  ORGANIZATION_PREFERENCE_KEY,
  type OrganizationFeatureAvailability,
  type OrganizationMembership,
} from "@/services/organizations/organization.service"
import { useAuth } from "@/context/auth/auth.context"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import { resolveOrganizationSelection } from "./organization-selection"
import { organizationViewState } from "./organization-view-state"

type OrganizationState = "loading" | "ready" | "error"
type FeatureState = "loading" | "ready" | "error"
type OrganizationContextValue = {
  organizations: OrganizationMembership[]
  selectedOrganization: OrganizationMembership | null
  state: OrganizationState
  error: string
  notice: string
  retry: () => void
  selectOrganization: (organizationId: string) => void
  features: OrganizationFeatureAvailability[]
  featureState: FeatureState
  retryFeatures: () => void
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

function storedPreference() {
  try {
    return localStorage.getItem(ORGANIZATION_PREFERENCE_KEY)
  } catch {
    return null
  }
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [requestState, setRequestState] = useState<{
    token: string | null
    retryCount: number
    state: OrganizationState
  }>({ token: null, retryCount: 0, state: "loading" })
  const [notice, setNotice] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [featureRetryCount, setFeatureRetryCount] = useState(0)
  const [featureRequest, setFeatureRequest] = useState<{
    token: string | null
    organizationId: string | null
    retryCount: number
    state: Exclude<FeatureState, "loading">
    items: OrganizationFeatureAvailability[]
  } | null>(null)

  useEffect(() => {
    if (!accessToken) return
    let active = true
    listOrganizations(accessToken)
      .then((items) => {
        if (!active) return
        setOrganizations(items)
        const savedId = storedPreference()
        const { selected, invalidSavedPreference } = resolveOrganizationSelection(items, savedId)
        setSelectedId(selected?.id ?? null)
        setNotice(invalidSavedPreference ? "A organização salva não está mais disponível. Selecionamos uma organização à qual sua conta tem acesso." : "")
        try {
          if (selected) localStorage.setItem(ORGANIZATION_PREFERENCE_KEY, selected.id)
          else localStorage.removeItem(ORGANIZATION_PREFERENCE_KEY)
        } catch {
          setNotice("Não foi possível salvar a preferência de organização neste navegador.")
        }
        setRequestState({ token: accessToken, retryCount, state: "ready" })
      })
      .catch(() => {
        if (active) {
          setRequestState({ token: accessToken, retryCount, state: "error" })
        }
      })
    return () => { active = false }
  }, [accessToken, retryCount])

  useEffect(() => {
    if (!accessToken || !selectedId) return
    let active = true
    listOrganizationFeatures(accessToken, selectedId)
      .then((items) => {
        if (active) setFeatureRequest({ token: accessToken, organizationId: selectedId,
          retryCount: featureRetryCount, state: "ready", items })
      })
      .catch(() => {
        if (active) setFeatureRequest({ token: accessToken, organizationId: selectedId,
          retryCount: featureRetryCount, state: "error", items: [] })
      })
    return () => { active = false }
  }, [accessToken, selectedId, featureRetryCount])

  const selectOrganization = useCallback((organizationId: string) => {
    if (!organizations.some((organization) => organization.id === organizationId)) {
      setNotice("A organização selecionada não está disponível para sua conta.")
      return
    }
    try {
      localStorage.setItem(ORGANIZATION_PREFERENCE_KEY, organizationId)
      setSelectedId(organizationId)
      setNotice("")
    } catch {
      setNotice("Não foi possível salvar a preferência de organização neste navegador.")
    }
  }, [organizations])

  useEffect(() => {
    function syncPreference(event: StorageEvent) {
      if (event.key !== ORGANIZATION_PREFERENCE_KEY) return
      const { selected, invalidSavedPreference } = resolveOrganizationSelection(organizations, event.newValue)
      setSelectedId(selected?.id ?? null)
      setNotice(invalidSavedPreference ? "A organização salva não está mais disponível. Selecionamos uma organização à qual sua conta tem acesso." : "")
      try {
        if (selected) localStorage.setItem(ORGANIZATION_PREFERENCE_KEY, selected.id)
      } catch {
        setNotice("Não foi possível salvar a preferência de organização neste navegador.")
      }
    }
    window.addEventListener("storage", syncPreference)
    return () => window.removeEventListener("storage", syncPreference)
  }, [organizations])

  const retry = useCallback(() => setRetryCount((count) => count + 1), [])
  const retryFeatures = useCallback(() => setFeatureRetryCount((count) => count + 1), [])
  const selectedOrganization = organizations.find((organization) => organization.id === selectedId) ?? null
  const isCurrentRequest = requestState.token === accessToken && requestState.retryCount === retryCount
  const state = isCurrentRequest ? requestState.state : "loading"
  const isCurrentFeatureRequest = featureRequest !== null
    && featureRequest.token === accessToken
    && featureRequest.organizationId === selectedId
    && featureRequest.retryCount === featureRetryCount
  const featureState: FeatureState = !accessToken || !selectedId
    ? "loading"
    : isCurrentFeatureRequest ? featureRequest.state : "loading"
  const features = featureState === "ready" && featureRequest ? featureRequest.items : []
  const error = state === "error" ? "Não foi possível carregar suas organizações." : ""
  const viewState = organizationViewState(state, organizations)
  const value = { organizations, selectedOrganization, state, error, notice, retry, selectOrganization,
    features, featureState, retryFeatures }

  if (viewState === "loading") return <PageLoader />
  if (viewState === "error") return <section role="alert" className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center"><p>{error}</p><button type="button" className="rounded-md border px-4 py-2 focus-visible:ring-2 focus-visible:ring-ring" onClick={retry}>Tentar novamente</button></section>
  if (viewState === "empty") return <section role="status" className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-3 px-6 text-center"><h1 className="text-xl font-semibold">Nenhuma organização disponível</h1><p className="text-muted-foreground">Sua conta ainda não tem vínculo com uma organização. Peça para uma pessoa administradora convidar você.</p></section>

  return <OrganizationContext.Provider value={value}><OrganizationPageBoundary key={`${user?.id ?? ""}:${selectedId ?? ""}`}>{children}</OrganizationPageBoundary></OrganizationContext.Provider>
}

function OrganizationPageBoundary({ children }: { children: ReactNode }) {
  return children
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) throw new Error("useOrganization must be used inside OrganizationProvider")
  return context
}
