import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth/auth.context"
import { Button } from "@/components/ui/button"
import { BlocksPreview } from "@/components/previews/BlocksPreview"
import { AppHeader, MainLayout } from "@/layout/MainLayout"
import { PlatformBreadcrumb } from "@/layout/PlatformBreadcrumb"
import { AppSidebar } from "@/layout/PlatformSidebar"
import { WorkAreaPageHeader } from "@/layout/WorkAreaPageHeader"
import {
  decidePublicationReview,
  getPublicationReviewPreview,
  listPublicationReviewInbox,
  type PublicationReviewInboxItem,
  type PublicationReviewPreview,
} from "@/services/projects/publication.service"
import { defaultProjectTheme, parseProjectTheme, themeVariables } from "@/pages/editor/lib/project-theme"

export default function PublicationReviewInboxPage() {
  const { accessToken } = useAuth()
  const [requests, setRequests] = useState<PublicationReviewInboxItem[]>([])
  const [preview, setPreview] = useState<{ requestId: string; value: PublicationReviewPreview } | null>(null)
  const [previewBusy, setPreviewBusy] = useState<string | null>(null)
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("builder-sidebar-collapsed") === "true")
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let active = true
    void listPublicationReviewInbox(accessToken)
      .then((items) => { if (active) { setRequests(items); setError("") } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as revisões.") })
    return () => { active = false }
  }, [accessToken])

  async function togglePreview(request: PublicationReviewInboxItem) {
    if (!accessToken || !request.canDecide || previewBusy || decisionBusy) return
    if (preview?.requestId === request.id) { setPreview(null); return }
    setPreviewBusy(request.id)
    setError("")
    try {
      const value = await getPublicationReviewPreview(accessToken, request)
      setPreview({ requestId: request.id, value })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a revisão solicitada.")
    } finally { setPreviewBusy(null) }
  }

  async function decide(request: PublicationReviewInboxItem, approved: boolean) {
    if (!accessToken || !request.canDecide || decisionBusy || previewBusy) return
    setDecisionBusy(request.id)
    setError("")
    try {
      await decidePublicationReview(accessToken, request.projectId, request.id, approved)
      setRequests((items) => items.filter((item) => item.id !== request.id))
      setPreview((current) => current?.requestId === request.id ? null : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível decidir esta revisão.")
    } finally { setDecisionBusy(null) }
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
    }} sidebarCollapsed={sidebarCollapsed} showPlatformThemeToggle className="px-3!"><PlatformBreadcrumb current="Revisões" /></AppHeader>}
    mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} sidebarLabel="Navegação principal" contentClassName="overflow-y-auto"
  >
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
      <WorkAreaPageHeader title="Revisões" description="Solicitações pendentes nos projetos em que você pode aprovar." />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {requests.length === 0 && !error && <p className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Nenhuma solicitação pendente para sua autoridade nesta organização.</p>}
      <ol className="flex flex-col gap-4">
        {requests.map((request) => {
          const expanded = preview?.requestId === request.id
          const theme = expanded
            ? themeVariables(parseProjectTheme(preview.value.document.theme) ?? defaultProjectTheme())
            : undefined
          return <li key={request.id} className="rounded-lg border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">{request.projectName}</h2>
                <p className="mt-1 text-sm">{request.operation === "PUBLISH" ? "Publicação" : `Restauração da publicação v${request.targetVersion}`} · revisão do projeto {request.projectRevision}</p>
                <p className="mt-1 text-xs text-muted-foreground">Solicitada em {new Date(request.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!request.canDecide || previewBusy !== null || decisionBusy !== null}
                  onClick={() => void togglePreview(request)}>
                  {previewBusy === request.id ? "Carregando…" : expanded ? "Fechar prévia" : "Ver prévia desta revisão"}
                </Button>
                {request.canDecide && <>
                  <Button variant="outline" disabled={previewBusy !== null || decisionBusy !== null}
                    onClick={() => void decide(request, false)}>
                    {decisionBusy === request.id ? "Salvando…" : "Rejeitar"}
                  </Button>
                  <Button disabled={previewBusy !== null || decisionBusy !== null}
                    onClick={() => void decide(request, true)}>
                    {decisionBusy === request.id ? "Salvando…" : "Aprovar"}
                  </Button>
                </>}
              </div>
            </div>
            {expanded && <section className="mt-5 max-h-[70svh] overflow-y-auto rounded-md border bg-muted/20 p-4" aria-label={`Prévia da revisão ${request.projectRevision}`}>
              <h3 className="mb-4 text-sm font-semibold">Conteúdo da revisão imutável {preview.value.projectRevision}</h3>
              <ol className="flex flex-col gap-4">
                {preview.value.document.pages.map((page) => <li key={page.id}>
                  <h4 className="mb-2 text-sm font-medium">{page.name}</h4>
                  <BlocksPreview blocks={page.blocks} themeStyle={theme} className="h-72 rounded-md border bg-background" />
                </li>)}
              </ol>
            </section>}
          </li>
        })}
      </ol>
    </main>
  </MainLayout>
}
