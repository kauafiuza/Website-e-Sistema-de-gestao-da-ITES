import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth/auth.context"
import { useOrganization } from "@/context/organization/organization.context"
import { AppHeader, MainLayout } from "@/layout/MainLayout"
import { AppSidebar } from "@/layout/PlatformSidebar"
import { PlatformBreadcrumb } from "@/layout/PlatformBreadcrumb"
import { WorkAreaPageHeader } from "@/layout/WorkAreaPageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { listOrganizationAuditEvents, OrganizationRequestError, type OrganizationAuditEvent, type OrganizationAuditEventPage } from "@/services/organizations/organization.service"

const actionLabels: Record<string, string> = {
  INVITATION_CREATED: "Convite enviado",
  INVITATION_REVOKED: "Convite revogado",
  MEMBERSHIP_ACCEPTED: "Convite aceito",
  MEMBERSHIP_REVOKED: "Acesso de membro revogado",
  PERMISSION_GRANTED: "Permissão concedida",
  PERMISSION_REVOKED: "Permissão revogada",
  REVIEW_REQUESTED: "Revisão solicitada",
  REVIEW_APPROVED: "Revisão aprovada",
  REVIEW_REJECTED: "Revisão rejeitada",
  PUBLICATION_PUBLISHED: "Publicação publicada",
  PUBLICATION_ACTIVATED: "Publicação ativada",
  PUBLICATION_DEACTIVATED: "Publicação desativada",
  PUBLICATION_RESTORED: "Publicação restaurada",
  PROJECT_REVISION_RESTORED: "Revisão do projeto restaurada",
  PROJECT_DELETED: "Projeto excluído",
  THEME_DELETED: "Tema excluído",
  SUBMISSIONS_READ: "Respostas consultadas",
  SUBMISSIONS_EXPORTED: "Respostas exportadas",
  PAGE_TEMPLATE_CREATED: "Modelo de página criado",
  PAGE_TEMPLATE_VERSION_CREATED: "Versão do modelo criada",
  PAGE_TEMPLATE_ARCHIVED: "Modelo de página arquivado",
}

const targetLabels: Record<string, string> = {
  INVITATION: "Convite",
  MEMBERSHIP: "Membership",
  PERMISSION_GRANT: "Permissão",
  PUBLICATION_REVIEW: "Revisão de publicação",
  PUBLICATION: "Publicação",
  PROJECT: "Projeto",
  THEME: "Tema",
  SUBMISSIONS: "Respostas",
  PAGE_TEMPLATE: "Modelo de página",
}

function AuditRow({ event }: { event: OrganizationAuditEvent }) {
  return <li className="flex flex-col gap-2 border-b py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{actionLabels[event.action] ?? event.action}</span>
        <Badge variant="outline">{targetLabels[event.targetType] ?? event.targetType}</Badge>
      </div>
      <p className="mt-1 break-all text-xs text-muted-foreground">Ator {event.actorUserId} · recurso {event.targetId}</p>
    </div>
    <time dateTime={event.occurredAt} className="shrink-0 text-sm text-muted-foreground">
      {new Date(event.occurredAt).toLocaleString("pt-BR")}
    </time>
  </li>
}

export default function OrganizationAuditPage() {
  const { accessToken } = useAuth()
  const { selectedOrganization } = useOrganization()
  const organizationId = selectedOrganization?.id ?? ""
  const [page, setPage] = useState<OrganizationAuditEventPage | null>(null)
  const [loadedKey, setLoadedKey] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("builder-sidebar-collapsed") === "true")
  const requestKey = `${organizationId}:${pageIndex}`
  const currentPage = loadedKey === requestKey ? page : null
  const currentError = loadedKey === requestKey ? error : ""
  const isLoading = Boolean(organizationId) && (loading || loadedKey !== requestKey)

  useEffect(() => {
    let active = true
    if (!accessToken || !organizationId) return () => { active = false }
    listOrganizationAuditEvents(accessToken, organizationId, pageIndex)
      .then((result) => {
        if (!active) return
        setPage(result)
        setError("")
        setLoadedKey(`${organizationId}:${pageIndex}`)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setPage(null)
        setError(cause instanceof OrganizationRequestError && cause.status === 403
          ? "Esta conta não recebeu o grant explícito ORGANIZATION_AUDIT_READ para esta organização."
          : cause instanceof Error ? cause.message : "Não foi possível carregar a trilha de auditoria.")
        setLoadedKey(`${organizationId}:${pageIndex}`)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accessToken, organizationId, pageIndex])

  function changePage(nextPage: number) {
    setPageIndex(Math.max(0, nextPage))
  }

  return <MainLayout
    sidebar={<AppSidebar collapsed={sidebarCollapsed} onClose={() => setMobileOpen(false)} />}
    mobileSidebar={<AppSidebar onClose={() => setMobileOpen(false)} />}
    header={<AppHeader onToggleSidebar={() => {
      if (window.innerWidth < 768) setMobileOpen((value) => !value)
      else setSidebarCollapsed((value) => {
        localStorage.setItem("builder-sidebar-collapsed", String(!value))
        return !value
      })
    }} sidebarCollapsed={sidebarCollapsed} showPlatformThemeToggle><PlatformBreadcrumb current="Trilha de auditoria" /></AppHeader>}
    mobileOpen={mobileOpen}
    onMobileOpenChange={setMobileOpen}
    sidebarLabel="Navegação principal"
    contentClassName="overflow-y-auto"
  >
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <WorkAreaPageHeader title="Trilha de auditoria" description={selectedOrganization?.name ?? "Organização ativa"} />
      <section aria-labelledby="audit-events-heading" className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="audit-events-heading" className="text-lg font-semibold">Eventos administrativos e acessos sensíveis</h2>
            <p className="mt-1 text-sm text-muted-foreground">A trilha registra ações, atores e identificadores de recurso. Dados pessoais e conteúdo de formulários não são incluídos.</p>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">{currentPage?.totalElements ?? 0} eventos</span>
        </div>
        {!organizationId ? <p role="status" className="mt-5 text-sm text-muted-foreground">Selecione uma organização para consultar os eventos.</p> : null}
        {isLoading ? <p role="status" className="mt-5 text-sm text-muted-foreground">Carregando eventos…</p> : null}
        {currentError ? <p role="alert" className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{currentError}</p> : null}
        {!isLoading && !currentError && currentPage?.items.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Nenhum evento registrado nesta organização.</p> : null}
        {currentPage?.items.length ? <ol className="mt-4 divide-y" aria-label="Eventos de auditoria">
          {currentPage.items.map((event) => <AuditRow key={event.id} event={event} />)}
        </ol> : null}
        {currentPage ? <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <Button variant="outline" size="sm" disabled={isLoading || !currentPage.hasPrevious} onClick={() => changePage(pageIndex - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {currentPage.totalPages === 0 ? 0 : currentPage.page + 1} de {currentPage.totalPages}</span>
          <Button variant="outline" size="sm" disabled={isLoading || !currentPage.hasNext} onClick={() => changePage(pageIndex + 1)}>Próxima</Button>
        </div> : null}
      </section>
    </main>
  </MainLayout>
}
