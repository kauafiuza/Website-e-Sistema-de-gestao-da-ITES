import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ArrowUpRight, FilePenLine, Globe2 } from "lucide-react"
import { useAuth } from "@/context/auth/auth.context"
import { AppHeader, MainLayout } from "@/layout/MainLayout"
import { PlatformBreadcrumb } from "@/layout/PlatformBreadcrumb"
import { AppSidebar } from "@/layout/PlatformSidebar"
import { WorkAreaPageHeader } from "@/layout/WorkAreaPageHeader"
import { ProjectToolbar } from "@/pages/projects/components/ProjectToolbar"
import type { ProjectSort } from "@/pages/projects/libs/project-list"
import { BlocksPreview } from "@/components/previews/BlocksPreview"
import { defaultProjectTheme, parseProjectTheme, themeVariables } from "@/pages/editor/lib/project-theme"
import { AnimatedBadge } from "@/components/motion/animated-badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/motion/card"
import { CenterMorphModal, CenterMorphModalContent } from "@/components/motion/center-morph-modal"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { useInfinitePage } from "@/hooks/use-infinite-page"
import InfiniteScroll from "react-infinite-scroll-component"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { webPaths } from "@/router/helpers/route-paths"
import { listProjectRevisions, listProjects } from "@/services/projects/project.service"
import type { ProjectSummary } from "@/types/auth/project.types"
import {
  decidePublicationReview, getPublicationsOverview, listPublicationReviewRequests, listPublications,
  publishProject, publicUrl, requestPublicationReview,
  type DailyActivity, type Publication, type PublicationReviewRequest,
} from "@/services/projects/publication.service"

const chartConfig = {
  views: { label: "Visualizações", color: "var(--chart-1)" },
  clicks: { label: "Cliques", color: "var(--chart-2)" },
  interactions: { label: "Interações", color: "var(--chart-3)" },
}

function lastThirtyDays(daily: DailyActivity[]) {
  const byDay = new Map(daily.map((item) => [item.day, item]))
  const today = new Date()
  return Array.from({ length: 30 }, (_, offset) => {
    const day = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 29 + offset))
    const key = day.toISOString().slice(0, 10)
    return { day: key, label: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
      views: byDay.get(key)?.views ?? 0, clicks: byDay.get(key)?.clicks ?? 0, interactions: byDay.get(key)?.interactions ?? 0 }
  })
}

function ActivityChart({ daily }: { daily: DailyActivity[] }) {
  return <ChartContainer config={chartConfig} className="h-52 w-full aspect-auto">
    <AreaChart data={lastThirtyDays(daily)} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Area dataKey="views" type="monotone" stroke="var(--color-views)" fill="var(--color-views)" fillOpacity={0.12} strokeWidth={2} />
      <Area dataKey="clicks" type="monotone" stroke="var(--color-clicks)" fill="var(--color-clicks)" fillOpacity={0.08} strokeWidth={2} />
      <Area dataKey="interactions" type="monotone" stroke="var(--color-interactions)" fill="var(--color-interactions)" fillOpacity={0.08} strokeWidth={2} />
    </AreaChart>
  </ChartContainer>
}

function PublicationCard({ publication }: { publication: Publication }) {
  const theme = parseProjectTheme(publication.preview?.theme) ?? defaultProjectTheme()
  const publishedAt = publication.versions.find((version) => version.number === publication.currentVersion)?.publishedAt
  return <Card size="compact" className="relative min-w-0 gap-0 overflow-hidden border-border bg-card py-0 pb-4">
    <CardContent className="relative px-0">
      <BlocksPreview blocks={publication.preview?.blocks ?? []} themeStyle={themeVariables(theme)} className="h-40" emptyState={<FilePenLine className="size-10 stroke-[1.5]" />} />
      <AnimatedBadge size="sm" status={publication.active ? "success" : "warning"} className="absolute top-3 right-3 bg-card/90">{publication.active ? "Publicado" : "Pausado"}</AnimatedBadge>
    </CardContent>
    <CardHeader className="gap-1 px-4 pt-4 pb-4">
      <CardTitle as="h2" className="min-w-0 text-pretty break-words">{publication.projectName}</CardTitle>
      <CardDescription>Publicado em {publishedAt ? new Date(publishedAt).toLocaleDateString("pt-BR") : "—"} · {publication.views} visualizações</CardDescription>
    </CardHeader>
    <CardFooter className="px-4"><a href={publicUrl(publication.publicKey)} target="_blank" rel="noreferrer" aria-label={`Abrir ${publication.projectName} na web`} className="relative z-20 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-muted/50 px-3 text-sm font-medium text-primary transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">Abrir site publicado <ArrowUpRight className="size-4" aria-hidden="true" /></a></CardFooter>
    <Link to={`/publications/${publication.projectId}`} aria-label={`Ver detalhes da publicação ${publication.projectName}`} className="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring" />
  </Card>
}

export default function PublicationsPage() {
  const { accessToken } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("builder-sidebar-collapsed") === "true")
  const publicationPages = useInfinitePage<Publication>(10)
  const { loadFirst: loadFirstPublicationPage, loadMore: loadMorePublicationPage } = publicationPages
  const projectPickerPages = useInfinitePage<ProjectSummary>(10)
  const { loadFirst: loadFirstProjectPickerPage, loadMore: loadMoreProjectPickerPage } = projectPickerPages
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerError, setPickerError] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [publishBusy, setPublishBusy] = useState(false)
  const [reviewRequests, setReviewRequests] = useState<PublicationReviewRequest[]>([])
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null)
  const [overview, setOverview] = useState<DailyActivity[]>([])
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<ProjectSort>("recent")
  const [searchQuery, setSearchQuery] = useState(query)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => { setMobile(media.matches); setMobileOpen(false) }
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(query), 250)
    return () => window.clearTimeout(timeout)
  }, [query])
  const loadPublications = useCallback((page: number, size: number) => {
    if (!accessToken) return Promise.reject(new Error("Sessão indisponível"))
    return listPublications(accessToken, { page, size, q: searchQuery, sort })
  }, [accessToken, searchQuery, sort])
  useEffect(() => {
    if (!accessToken) return
    let active = true
    void Promise.all([
      loadFirstPublicationPage(loadPublications),
      getPublicationsOverview(accessToken),
    ]).then(([, activity]) => {
      if (!active) return
      setOverview(activity)
      setError("")
    }).catch(() => {
      if (active) setError("Não foi possível carregar as publicações.")
    })
    return () => {
      active = false
    }
  }, [accessToken, loadFirstPublicationPage, loadPublications])
  useEffect(() => {
    if (!accessToken || !pickerOpen) return
    let active = true
    void loadFirstProjectPickerPage((page, size) => listProjects(accessToken, { page, size }))
      .then(() => {
        if (active) setPickerError("")
      })
      .catch(() => {
        if (active) setPickerError("Não foi possível carregar seus projetos.")
      })
    return () => {
      active = false
    }
  }, [accessToken, loadFirstProjectPickerPage, pickerOpen])
  useEffect(() => {
    if (!accessToken || !selectedProjectId) return
    let active = true
    void Promise.all([listProjectRevisions(accessToken, selectedProjectId, 0, 1), listPublicationReviewRequests(accessToken, selectedProjectId)])
      .then(([history, requests]) => {
        if (!active) return
        setSelectedRevisionId(history.items[0]?.id ?? null)
        setReviewRequests(requests)
      })
      .catch(() => { if (active) { setSelectedRevisionId(null); setReviewRequests([]) } })
    return () => { active = false }
  }, [accessToken, selectedProjectId])
  const items = publicationPages.items
  const shown = useMemo(() => items, [items])
  function toggleSidebar() {
    if (mobile) { setMobileOpen((open) => !open); return }
    setSidebarCollapsed((value) => { localStorage.setItem("builder-sidebar-collapsed", String(!value)); return !value })
  }
  function openPicker() {
    setSelectedProjectId(null)
    setSelectedRevisionId(null)
    setReviewRequests([])
    setPickerError("")
    setPickerOpen(true)
  }
  async function publishSelected() {
    const request = currentPublishReview
    if (!accessToken || !selectedProjectId || !request || request.state !== "APPROVED" || publishBusy) return
    setPublishBusy(true)
    setPickerError("")
    try {
      const published = await publishProject(accessToken, selectedProjectId, request.id)
      if (!searchQuery.trim() || published.projectName.toLocaleLowerCase("pt-BR").includes(searchQuery.trim().toLocaleLowerCase("pt-BR"))) {
        await loadFirstPublicationPage(loadPublications)
      }
      setPickerOpen(false)
    } catch {
      setPickerError("Não foi possível publicar o projeto. Tente novamente.")
    } finally { setPublishBusy(false) }
  }
  const currentPublishReview = reviewRequests.find((request) => request.operation === "PUBLISH"
    && request.projectRevisionId === selectedRevisionId && !request.consumedAt)

  async function requestPublishReview() {
    if (!accessToken || !selectedProjectId || !selectedRevisionId || publishBusy) return
    setPublishBusy(true)
    setPickerError("")
    try {
      const request = await requestPublicationReview(accessToken, selectedProjectId, selectedRevisionId, "PUBLISH")
      setReviewRequests((items) => [request, ...items])
    } catch (cause) {
      setPickerError(cause instanceof Error ? cause.message : "Não foi possível solicitar a revisão.")
    } finally { setPublishBusy(false) }
  }

  async function decidePublishReview(approved: boolean) {
    if (!accessToken || !selectedProjectId || !currentPublishReview?.canDecide || publishBusy) return
    setPublishBusy(true)
    setPickerError("")
    try {
      const result = await decidePublicationReview(accessToken, selectedProjectId, currentPublishReview.id, approved)
      setReviewRequests((items) => items.map((item) => item.id === result.id ? result : item))
    } catch (cause) {
      setPickerError(cause instanceof Error ? cause.message : "Não foi possível decidir a revisão.")
    } finally { setPublishBusy(false) }
  }
  return <MainLayout
    sidebar={<AppSidebar collapsed={sidebarCollapsed} onClose={() => setMobileOpen(false)} />}
    mobileSidebar={<AppSidebar onClose={() => setMobileOpen(false)} />}
    header={<AppHeader onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} showPlatformThemeToggle className="px-3!"><PlatformBreadcrumb current="Minhas publicações" /></AppHeader>}
    mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} sidebarLabel="Navegação principal" contentClassName="overflow-y-auto" contentId="publications-scroll-container"
  >
    <main className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <WorkAreaPageHeader title="Minhas publicações" description="Acompanhe o alcance dos seus sites e gerencie suas versões." action={<Button onClick={openPicker}><Globe2 data-icon="inline-start" aria-hidden="true" /> Publicar um projeto!</Button>} />
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {!publicationPages.loading && publicationPages.totalElements > 0 && <section className="mt-8 rounded-lg border bg-card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Atividade dos últimos 30 dias</h2><span className="text-xs text-muted-foreground">Visualizações · Cliques · Interações</span></div><ActivityChart daily={overview} /></section>}
      <ProjectToolbar query={query} sort={sort} count={shown.length} onQueryChange={setQuery} onSortChange={setSort} />
      {publicationPages.loading && shown.length === 0 ? <p role="status" className="mt-8 text-muted-foreground">Carregando publicações…</p> : publicationPages.totalElements === 0 && !query.trim() ? <Empty className="mt-8"><EmptyHeader><EmptyTitle><h2>Escolha um projeto para publicar!</h2></EmptyTitle><EmptyDescription>Selecione um dos seus projetos e publique o site diretamente por aqui.</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={openPicker}>Escolher projeto</Button></EmptyContent></Empty> : shown.length === 0 ? <p className="mt-8 text-muted-foreground">Nenhuma publicação encontrada.</p> : <section aria-busy={publicationPages.loading}>
        {publicationPages.loading ? <p role="status" className="mt-6 text-sm text-muted-foreground">Atualizando publicações…</p> : null}
        <InfiniteScroll dataLength={shown.length} next={() => void loadMorePublicationPage(loadPublications).catch(() => setError("Não foi possível carregar mais publicações."))} hasMore={publicationPages.hasMore} loader={publicationPages.loadingMore ? <p className="py-6 text-center text-sm text-muted-foreground">Carregando mais publicações…</p> : null} endMessage={<p className="py-6 text-center text-xs text-muted-foreground">Você chegou ao fim da lista.</p>} scrollableTarget="publications-scroll-container" className="mt-6!"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{shown.map((item) => <PublicationCard key={item.projectId} publication={item} />)}</div></InfiniteScroll>
      </section>}
    </main>
    <CenterMorphModal open={pickerOpen} onOpenChange={(open) => { if (!open && !publishBusy) setPickerOpen(false) }}>
      <CenterMorphModalContent ariaLabel="Escolher projeto para publicar" closeButtonLabel="Fechar escolha de projeto" className="builder-ui max-w-xl bg-card p-6 text-foreground" backdropClassName="bg-black/60" dismissible={!publishBusy}>
        <div id="publication-project-picker-scroll" className="flex max-h-[80svh] flex-col gap-5 overflow-y-auto">
          <div><h2 className="text-xl font-semibold">{selectedProjectId ? "Publicar projeto?" : "Escolha um projeto para publicar"}</h2><p className="mt-1 text-sm text-muted-foreground">{selectedProjectId ? "O site ficará acessível publicamente pelo link de publicação." : "Selecione um projeto seu para colocar o site no ar."}</p></div>
          {projectPickerPages.loading && projectPickerPages.items.length === 0 ? <p role="status" className="py-5 text-sm text-muted-foreground">Carregando projetos…</p> : selectedProjectId ? <p className="rounded-lg border bg-muted/30 p-4 font-medium">{projectPickerPages.items.find((project) => project.id === selectedProjectId)?.name}</p> : projectPickerPages.totalElements ? <>
            {projectPickerPages.loading ? <p role="status" className="text-sm text-muted-foreground">Atualizando projetos…</p> : null}
            <InfiniteScroll dataLength={projectPickerPages.items.length} next={() => void loadMoreProjectPickerPage((page, size) => listProjects(accessToken!, { page, size })).catch(() => setPickerError("Não foi possível carregar mais projetos."))} hasMore={projectPickerPages.hasMore} loader={<p className="py-3 text-center text-sm text-muted-foreground">Carregando projetos…</p>} scrollableTarget="publication-project-picker-scroll" className="flex flex-col gap-2">{projectPickerPages.items.map((project) => {
            const alreadyPublished = project.publicationActive != null
            return <button key={project.id} type="button" disabled={alreadyPublished} onClick={() => { setReviewRequests([]); setSelectedRevisionId(null); setSelectedProjectId(project.id) }} className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"><span className="min-w-0 truncate font-medium">{project.name}</span><span className="shrink-0 text-xs text-muted-foreground">{alreadyPublished ? "Já publicado" : "Selecionar"}</span></button>
          })}</InfiniteScroll>
          </> : <div className="flex flex-col gap-3"><p className="text-sm text-muted-foreground">Você ainda não tem projetos para publicar.</p><Button variant="secondary" render={<Link to={webPaths.projects} onClick={() => setPickerOpen(false)} />}>Criar projeto</Button></div>}
          {selectedProjectId && currentPublishReview?.state === "PENDING" && <p className="text-sm text-muted-foreground">Revisão {currentPublishReview.projectRevision} aguardando aprovação de outra pessoa.</p>}
          {selectedProjectId && currentPublishReview?.state === "APPROVED" && <p className="text-sm text-emerald-700">A revisão foi aprovada.</p>}
          {pickerError && <p role="alert" className="text-sm text-destructive">{pickerError}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={publishBusy} onClick={() => { if (selectedProjectId) { setSelectedProjectId(null); setSelectedRevisionId(null); setReviewRequests([]) } else setPickerOpen(false) }}>{selectedProjectId ? "Voltar" : "Cancelar"}</Button>
            {currentPublishReview?.state === "PENDING" && currentPublishReview.canDecide ? <><Button variant="outline" disabled={publishBusy} onClick={() => void decidePublishReview(false)}>Rejeitar revisão</Button><Button disabled={publishBusy} onClick={() => void decidePublishReview(true)}>Aprovar revisão</Button></> : null}
            {selectedProjectId && (!currentPublishReview || currentPublishReview.state === "REJECTED" || currentPublishReview.consumedAt) && <Button disabled={publishBusy || !selectedRevisionId} onClick={() => void requestPublishReview()}>{publishBusy ? "Solicitando…" : "Solicitar revisão"}</Button>}
            {selectedProjectId && currentPublishReview?.state === "APPROVED" && <Button disabled={publishBusy} onClick={() => void publishSelected()}>{publishBusy ? "Publicando…" : "Publicar versão aprovada"}</Button>}</div>
        </div>
      </CenterMorphModalContent>
    </CenterMorphModal>
  </MainLayout>
}
