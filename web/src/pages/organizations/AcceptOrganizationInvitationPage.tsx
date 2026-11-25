import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/auth/auth.context"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import { AuthShell } from "@/pages/auth/components/AuthShell"
import { ORGANIZATION_PREFERENCE_KEY, acceptOrganizationInvitation, lookupOrganizationInvitation, OrganizationRequestError, type OrganizationInvitationLookup } from "@/services/organizations/organization.service"

const PENDING_INVITATION_KEY = "builder-pending-organization-invitation-v1"

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("en-US")
}

export default function AcceptOrganizationInvitationPage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const invitationToken = params.get("token") ?? ""
  const { user, accessToken, ready } = useAuth()
  const [invitation, setInvitation] = useState<OrganizationInvitationLookup | null>(null)
  const [loading, setLoading] = useState(() => Boolean(invitationToken))
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState("")

  const matchesAccount = useMemo(() => invitation && user
    ? normalizeEmail(invitation.email) === normalizeEmail(user.email)
    : false, [invitation, user])

  useEffect(() => {
    let active = true
    if (!invitationToken) return
    lookupOrganizationInvitation(invitationToken)
      .then((result) => { if (active) setInvitation(result) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Convite indisponível.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [invitationToken])

  async function accept() {
    if (!accessToken || !invitation || busy) return
    setBusy(true)
    setError("")
    try {
      await acceptOrganizationInvitation(accessToken, invitationToken)
      try { localStorage.setItem(ORGANIZATION_PREFERENCE_KEY, invitation.organizationId) } catch { /* preferência opcional */ }
      setAccepted(true)
    } catch (cause) {
      if (cause instanceof OrganizationRequestError && cause.status === 403)
        setError("Entre com a conta do endereço convidado para aceitar este convite.")
      else setError(cause instanceof Error ? cause.message : "Não foi possível aceitar o convite.")
    } finally {
      setBusy(false)
    }
  }

  function continueSignup() {
    try { localStorage.setItem(PENDING_INVITATION_KEY, `${location.pathname}${location.search}`) } catch { /* o link do e-mail continua disponível */ }
  }

  if (loading || !ready) return <PageLoader />

  const canAccept = invitation?.state === "PENDING"
  const invitationError = invitationToken ? error : "O link não contém um convite válido."
  return <AuthShell
    eyebrow="Convite de organização"
    title={accepted ? "Convite aceito" : invitation ? `Entrar em ${invitation.organizationName}` : "Convite indisponível"}
    description={accepted
      ? "Seu membership está ativo. Uma pessoa administradora pode conceder as permissões de que você precisa."
      : invitation ? `Este convite foi enviado para ${invitation.email}.` : "Confira o link ou peça um novo convite à pessoa administradora."}
    footer={accepted ? <Link to="/projects" className="font-semibold text-primary hover:underline">Continuar para projetos</Link> : null}
  >
    {invitationError ? <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{invitationError}</p> : null}
    {invitation && !canAccept && !accepted ? <p role="status" className="mb-4 rounded-md border p-3 text-sm">{invitation.state === "PENDING" ? "Este convite expirou." : `Estado do convite: ${invitation.state.toLocaleLowerCase("pt-BR")}.`}</p> : null}
    {invitation && canAccept && !accepted && !user ? <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Entre ou crie uma conta verificada com o endereço convidado para continuar.</p>
      <Button className="w-full" render={<Link to="/entrar" state={{ from: { pathname: location.pathname, search: location.search } }} />}>Entrar</Button>
      <Link to={`/cadastro?email=${encodeURIComponent(invitation.email)}`} onClick={continueSignup} className="flex h-10 items-center justify-center rounded-md border text-sm font-medium hover:bg-muted">Criar conta com este e-mail</Link>
    </div> : null}
    {invitation && user && !accepted ? <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Conta atual: <strong className="text-foreground">{user.email}</strong></p>
      {!matchesAccount ? <p role="alert" className="text-sm text-destructive">Esta conta não corresponde ao endereço do convite.</p> : null}
      <Button className="w-full" disabled={!canAccept || !matchesAccount || busy} onClick={() => void accept()}>{busy ? "Aceitando…" : "Aceitar convite"}</Button>
      {!matchesAccount ? <Button variant="outline" className="w-full" render={<Link to="/entrar?addAccount=1" state={{ from: { pathname: location.pathname, search: location.search } }} />}>Trocar de conta</Button> : null}
    </div> : null}
  </AuthShell>
}
