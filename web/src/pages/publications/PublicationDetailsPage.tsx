import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useAuth } from "@/context/auth/auth.context"
import { AppHeader, MainLayout } from "@/layout/MainLayout"
import { PlatformBreadcrumb } from "@/layout/PlatformBreadcrumb"
import { AppSidebar } from "@/layout/PlatformSidebar"
import { WorkAreaPageHeader } from "@/layout/WorkAreaPageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { decidePublicationReview, exportFormSubmissions, getFormSubmissions, getPublication, getPublicationActivity, getPublicationAnalytics, listPublicationReviewRequests, publicUrl, requestPublicationReview, restorePublication, setPublicationActive, type DailyActivity, type FormSubmission, type Publication, type PublicationAnalytics, type PublicationReviewRequest } from "@/services/projects/publication.service"
import { OrganizationRequestError } from "@/services/organizations/organization.service"
import InfiniteScroll from "react-infinite-scroll-component"

const chartConfig = { views: { label: "Visualizações", color: "var(--chart-1)" }, clicks: { label: "Cliques", color: "var(--chart-2)" }, interactions: { label: "Interações", color: "var(--chart-3)" } }

function chartDays(daily: DailyActivity[]) {
  const byDay = new Map(daily.map((day) => [day.day, day]))
  return Array.from({ length: 30 }, (_, offset) => {
    const date = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 29 + offset))
    const key = date.toISOString().slice(0, 10)
    return { label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }), views: byDay.get(key)?.views ?? 0, clicks: byDay.get(key)?.clicks ?? 0, interactions: byDay.get(key)?.interactions ?? 0 }
  })
}

function responseLabel(submission: FormSubmission, key: string, value: string) {
  const field = submission.fieldSchema?.find((item) => item.id === key)
  return { label: field?.label ?? key, value: field?.type === "select" ? field.options?.find((option) => option.id === value)?.label ?? value : value }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof OrganizationRequestError) return error.message
  return error instanceof Error ? error.message : fallback
}

export default function PublicationDetailsPage() {
  const { projectId = "" } = useParams()
  const { accessToken } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("builder-sidebar-collapsed") === "true")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [analytics, setAnalytics] = useState<PublicationAnalytics | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [events, setEvents] = useState<PublicationAnalytics["recent"]["items"]>([])
  const [hasMoreSubmissions, setHasMoreSubmissions] = useState(false)
  const [hasMoreEvents, setHasMoreEvents] = useState(false)
  const [error, setError] = useState("")
  const [submissionError, setSubmissionError] = useState("")
  const [submissionSearch, setSubmissionSearch] = useState("")
  const [activityError, setActivityError] = useState("")
  const [busy, setBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [confirmPause, setConfirmPause] = useState(false)
  const [restoreVersion, setRestoreVersion] = useState<Publication["versions"][number] | null>(null)
  const [restoreError, setRestoreError] = useState("")
  const [reviewDecisionError, setReviewDecisionError] = useState("")
  const [reviews, setReviews] = useState<PublicationReviewRequest[]>([])
  const [reviewRequestsLoaded, setReviewRequestsLoaded] = useState(false)
  const [publicationAccessDenied, setPublicationAccessDenied] = useState(false)
  const currentVersion = publication?.versions.find((version) => version.number === publication.currentVersion)

  useEffect(() => {
    if (!accessToken || !projectId) return
    let active = true
    getPublication(accessToken, projectId)
      .then((item) => { if (active) { setPublication(item); setError("") } })
      .catch((cause) => { if (active) {
        setPublicationAccessDenied(cause instanceof OrganizationRequestError && cause.status === 403)
        setError(errorMessage(cause, "Não foi possível carregar esta publicação."))
      } })
    getPublicationAnalytics(accessToken, projectId)
      .then((activity) => { if (active) { setAnalytics(activity); setEvents(activity.recent.items); setHasMoreEvents(activity.recent.hasNext); setActivityError("") } })
      .catch((cause) => { if (active) setActivityError(errorMessage(cause, "Não foi possível carregar as métricas e atividades.")) })
    listPublicationReviewRequests(accessToken, projectId)
      .then((requests) => { if (active) { setReviews(requests); setReviewRequestsLoaded(true) } })
      .catch(() => { if (active) { setReviews([]); setReviewRequestsLoaded(true) } })
    return () => { active = false }
  }, [accessToken, projectId])

  useEffect(() => {
    if (!accessToken || !projectId) return
    let active = true
    const timer = window.setTimeout(() => {
      getFormSubmissions(accessToken, projectId, 0, 10, submissionSearch)
        .then((responses) => { if (active) { setSubmissions(responses.items); setHasMoreSubmissions(responses.hasNext); setSubmissionError("") } })
        .catch((cause) => { if (active) setSubmissionError(errorMessage(cause, "Não foi possível carregar as respostas.")) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [accessToken, projectId, submissionSearch])

  async function change(action: () => Promise<Publication>) {
    setBusy(true)
    try { setPublication(await action()); setConfirmPause(false); setError("") }
    catch (cause) { setError(errorMessage(cause, "Não foi possível atualizar a publicação.")) }
    finally { setBusy(false) }
  }
  async function confirmRestorePublication() {
    const review = restoreReview
    if (!accessToken || !restoreVersion || !review || review.state !== "APPROVED" || busy) return
    setBusy(true)
    setRestoreError("")
    try {
      setPublication(await restorePublication(accessToken, projectId, restoreVersion.number, review.id))
      setReviews((items) => items.map((item) => item.id === review.id ? { ...item, consumedAt: new Date().toISOString() } : item))
      setRestoreVersion(null)
      setError("")
    } catch (cause) {
      setRestoreError(errorMessage(cause, "Não foi possível restaurar esta publicação."))
    } finally {
      setBusy(false)
    }
  }
  const restoreReview = reviews.find((request) => request.operation === "RESTORE"
    && request.projectRevisionId === restoreVersion?.projectRevisionId
    && request.targetVersion === restoreVersion?.number && !request.consumedAt)

  async function requestRestoreApproval() {
    if (!accessToken || !restoreVersion || busy) return
    setBusy(true)
    setRestoreError("")
    try {
      const request = await requestPublicationReview(accessToken, projectId, restoreVersion.projectRevisionId,
        "RESTORE", restoreVersion.number)
      setReviews((items) => [request, ...items])
    } catch (cause) {
      setRestoreError(errorMessage(cause, "Não foi possível solicitar a revisão."))
    } finally { setBusy(false) }
  }

  async function decideRestoreApproval(approved: boolean) {
    if (!accessToken || !restoreReview?.canDecide || busy) return
    setBusy(true)
    setRestoreError("")
    try {
      const result = await decidePublicationReview(accessToken, projectId, restoreReview.id, approved)
      setReviews((items) => items.map((item) => item.id === result.id ? result : item))
    } catch (cause) {
      setRestoreError(errorMessage(cause, "Não foi possível decidir a revisão."))
    } finally { setBusy(false) }
  }
  async function decideReviewRequest(request: PublicationReviewRequest, approved: boolean) {
    if (!accessToken || !request.canDecide || busy) return
    setBusy(true)
    setReviewDecisionError("")
    try {
      const result = await decidePublicationReview(accessToken, projectId, request.id, approved)
      setReviews((items) => items.map((item) => item.id === result.id ? result : item))
    } catch (cause) {
      setReviewDecisionError(errorMessage(cause, "Não foi possível decidir a revisão."))
    } finally { setBusy(false) }
  }
  async function moreSubmissions() {
    if (!accessToken) return
    setBusy(true)
    try { const next = await getFormSubmissions(accessToken, projectId, Math.floor(submissions.length / 10), 10, submissionSearch); setSubmissions((current) => [...current, ...next.items]); setHasMoreSubmissions(next.hasNext) }
    catch (cause) { setSubmissionError(errorMessage(cause, "Não foi possível carregar mais respostas.")) }
    finally { setBusy(false) }
  }
  async function moreEvents() {
    if (!accessToken) return
    setBusy(true)
    try { const next = await getPublicationActivity(accessToken, projectId, Math.floor(events.length / 10)); setEvents((current) => [...current, ...next.items]); setHasMoreEvents(next.hasNext) }
    catch (cause) { setActivityError(errorMessage(cause, "Não foi possível carregar mais atividades.")) }
    finally { setBusy(false) }
  }
  async function exportSubmissions() {
    if (!accessToken) return
    setExportBusy(true)
    setSubmissionError("")
    try {
      const blob = await exportFormSubmissions(accessToken, projectId, submissionSearch)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "publication-submissions.csv"
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (cause) {
      setSubmissionError(errorMessage(cause, "Não foi possível exportar as respostas."))
    } finally {
      setExportBusy(false)
    }
  }

  return <MainLayout
    sidebar={<AppSidebar collapsed={sidebarCollapsed} onClose={() => setMobileOpen(false)} />}
    mobileSidebar={<AppSidebar onClose={() => setMobileOpen(false)} />}
    header={<AppHeader onToggleSidebar={() => { if (window.innerWidth < 768) setMobileOpen((value) => !value); else setSidebarCollapsed((value) => { localStorage.setItem("builder-sidebar-collapsed", String(!value)); return !value }) }} sidebarCollapsed={sidebarCollapsed} showPlatformThemeToggle className="px-3!"><PlatformBreadcrumb current={publication?.projectName ?? "Detalhes da publicação"} ancestors={[{ label: "Minhas publicações", to: "/publications" }]} /></AppHeader>}
    mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} sidebarLabel="Navegação principal" contentClassName="overflow-y-auto"
  >
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
      <WorkAreaPageHeader title={publication?.projectName ?? "Detalhes da publicação"} description={publication ? `Publicação v${publication.currentVersion} · versão do projeto ${currentVersion?.projectRevision ?? "—"} · ${publication.active ? "No ar" : "Pausada"}` : "Carregando publicação…"} />
      {error && !(publicationAccessDenied && reviewRequestsLoaded) && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!publication && publicationAccessDenied && reviewRequestsLoaded && <section className="rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Revisões pendentes</h2>
        <p className="mt-1 text-sm text-muted-foreground">Esta visualização mostra somente os dados necessários para decidir solicitações, sem exibir o conteúdo do projeto ou da publicação.</p>
        {reviewDecisionError && <p role="alert" className="mt-3 text-sm text-destructive">{reviewDecisionError}</p>}
        {reviews.length === 0 ? <p className="mt-4 text-sm">Nenhuma solicitação de revisão.</p> : <ul className="mt-3 divide-y">{reviews.map((request) => <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-medium">{request.operation === "PUBLISH" ? "Publicação" : `Restauração da publicação v${request.targetVersion}`} · revisão do projeto {request.projectRevision}</p><p className="text-sm text-muted-foreground">Solicitada em {new Date(request.createdAt).toLocaleString("pt-BR")} · {request.state === "PENDING" ? "Pendente" : request.state === "APPROVED" ? "Aprovada" : "Rejeitada"}</p></div>
          {request.canDecide && request.state === "PENDING" ? <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => void decideReviewRequest(request, false)}>Rejeitar</Button><Button disabled={busy} onClick={() => void decideReviewRequest(request, true)}>Aprovar</Button></div> : null}
        </li>)}</ul>}
      </section>}
      {publication && <>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => publication.active ? setConfirmPause(true) : accessToken && void change(() => setPublicationActive(accessToken, projectId, true))}>{publication.active ? "Pausar publicação" : "Reativar publicação"}</Button><Button variant="outline" render={<a href={publicUrl(publication.publicKey)} target="_blank" rel="noreferrer" />}>Abrir site</Button><Button variant="outline" render={<Link to={`/editor/${projectId}`} />}>Abrir editor</Button></div>
        {confirmPause && <div className="rounded-lg border p-4"><p>O site deixará de ficar acessível pelo link público. As respostas e estatísticas serão preservadas.</p><div className="mt-3 flex gap-2"><Button disabled={busy} onClick={() => accessToken && void change(() => setPublicationActive(accessToken, projectId, false))}>Confirmar pausa</Button><Button variant="ghost" onClick={() => setConfirmPause(false)}>Cancelar</Button></div></div>}
        <div className="grid gap-4 sm:grid-cols-3">{[["Visualizações", publication.views], ["Cliques", publication.clicks], ["Envios", publication.interactions]].map(([label, value]) => <Card key={label}><CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{value}</CardContent></Card>)}</div>
        <section className="rounded-lg border bg-card p-5"><h2 className="text-lg font-semibold">Atividade dos últimos 30 dias</h2>{activityError && <p role="alert" className="mt-3 text-sm text-destructive">{activityError}</p>}{analytics && <ChartContainer config={chartConfig} className="mt-4 h-64 w-full aspect-auto"><AreaChart data={chartDays(analytics.daily)}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey="views" type="monotone" stroke="var(--color-views)" fill="var(--color-views)" fillOpacity={0.12} /><Area dataKey="clicks" type="monotone" stroke="var(--color-clicks)" fill="var(--color-clicks)" fillOpacity={0.08} /><Area dataKey="interactions" type="monotone" stroke="var(--color-interactions)" fill="var(--color-interactions)" fillOpacity={0.08} /></AreaChart></ChartContainer>}</section>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Respostas dos formulários</h2><p className="text-sm text-muted-foreground">A busca considera o nome do formulário, as perguntas e os valores enviados.</p></div><Button variant="outline" disabled={exportBusy} onClick={() => void exportSubmissions()}>{exportBusy ? "Exportando…" : "Exportar CSV"}</Button></div><label className="mt-4 grid gap-1 text-sm font-medium">Buscar respostas<input className="rounded-md border bg-background px-3 py-2 font-normal" value={submissionSearch} onChange={(event) => setSubmissionSearch(event.target.value)} placeholder="Pergunta, resposta ou nome do formulário" /></label>{submissionError ? <p role="alert" className="mt-3 text-sm text-destructive">{submissionError}</p> : submissions.length === 0 ? <p className="mt-4 text-sm">{submissionSearch ? "Nenhuma resposta corresponde à busca." : "Nenhuma resposta recebida."}</p> : <InfiniteScroll dataLength={submissions.length} next={() => void moreSubmissions()} hasMore={hasMoreSubmissions} height={384} loader={<p className="py-3 text-center text-xs text-muted-foreground">Carregando respostas…</p>}>{<ol className="flex flex-col gap-3 pr-3">{submissions.map((submission) => <li key={submission.id} className="rounded-md border p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{submission.formName}</strong><time dateTime={submission.occurredAt} className="text-sm text-muted-foreground">{new Date(submission.occurredAt).toLocaleString("pt-BR")}</time></div><dl className="mt-3 flex flex-col gap-1 text-sm">{Object.entries(submission.fields).map(([key, value]) => { const display = responseLabel(submission, key, value); return <div key={key} className="break-words"><dt className="inline font-medium">{display.label}: </dt><dd className="inline whitespace-pre-wrap">{display.value}</dd></div> })}</dl></li>)}</ol>}</InfiniteScroll>}</section>
          <section className="rounded-lg border bg-card p-5"><h2 className="text-lg font-semibold">Registro de atividades</h2><p className="text-sm text-muted-foreground">Eventos sem conteúdo de respostas.</p>{activityError && <p role="alert" className="mt-3 text-sm text-destructive">{activityError}</p>}{events.length ? <InfiniteScroll dataLength={events.length} next={() => void moreEvents()} hasMore={hasMoreEvents} height={384} loader={<p className="py-3 text-center text-xs text-muted-foreground">Carregando atividades…</p>}><ol className="divide-y pr-3">{events.map((event) => <li key={event.id} className="flex justify-between gap-3 py-3 text-sm"><span>{event.type === "view" ? "Visualização" : event.type === "click" ? "Clique" : "Envio de formulário"} · {event.path || "/"}</span><time dateTime={event.occurredAt} className="shrink-0 text-muted-foreground">{new Date(event.occurredAt).toLocaleString("pt-BR")}</time></li>)}</ol></InfiniteScroll> : <p className="mt-4 text-sm">Nenhuma atividade registrada.</p>}</section>
        </div>
        <section className="rounded-lg border bg-card p-5"><h2 className="text-lg font-semibold">Versões publicadas</h2><ul className="mt-3 divide-y">{publication.versions.map((version) => <li key={version.number} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">Publicação v{version.number} · versão do projeto {version.projectRevision}</p><p className="text-sm text-muted-foreground">{new Date(version.publishedAt).toLocaleString("pt-BR")}{version.number === publication.currentVersion ? " · Atual" : ""}</p></div><Button variant="outline" disabled={busy || version.number === publication.currentVersion} onClick={() => { setRestoreError(""); setRestoreVersion(version) }}>Restaurar publicação v{version.number}</Button></li>)}</ul></section>
      </>}
    </main>
    <AlertDialog open={restoreVersion !== null} onOpenChange={(open) => { if (!open && !busy) setRestoreVersion(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publicar novamente a versão v{restoreVersion?.number}?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação colocará imediatamente a publicação v{restoreVersion?.number} no ar, substituindo a versão pública atual. O rascunho do projeto não será alterado.</AlertDialogDescription>
        </AlertDialogHeader>
        {restoreReview?.state === "PENDING" ? <p className="text-sm text-muted-foreground">Solicitação de revisão da revisão {restoreReview.projectRevision} pendente.</p> : null}
        {restoreReview?.state === "APPROVED" ? <p className="text-sm text-emerald-700">A revisão foi aprovada por outra pessoa.</p> : null}
        {restoreReview?.state === "REJECTED" ? <p className="text-sm text-destructive">A solicitação foi rejeitada.</p> : null}
        {restoreError && <p role="alert" className="text-sm text-destructive">{restoreError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          {restoreReview?.state === "PENDING" && restoreReview.canDecide ? <>
            <Button variant="outline" disabled={busy} onClick={() => void decideRestoreApproval(false)}>Rejeitar revisão</Button>
            <Button disabled={busy} onClick={() => void decideRestoreApproval(true)}>Aprovar revisão</Button>
          </> : null}
          {(!restoreReview || restoreReview.state === "REJECTED" || restoreReview.consumedAt) && <Button disabled={busy} onClick={() => void requestRestoreApproval()}>Solicitar revisão</Button>}
          {restoreReview?.state === "APPROVED" && <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void confirmRestorePublication() }}>
            {busy ? "Publicando…" : `Restaurar v${restoreVersion?.number}`}
          </AlertDialogAction>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </MainLayout>
}
