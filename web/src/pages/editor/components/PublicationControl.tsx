import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Globe2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CenterMorphModal, CenterMorphModalContent } from "@/components/motion/center-morph-modal"
import { getPublication, publishProject, publicUrl, type Publication } from "@/services/projects/publication.service"
import { webPaths } from "@/router/helpers/route-paths"
import { listProjectRevisions } from "@/services/projects/project.service"
import { decidePublicationReview, listPublicationReviewRequests, requestPublicationReview, type PublicationReviewRequest } from "@/services/projects/publication.service"

interface Props {
  token: string | null
  projectId?: string
  projectRevision?: number
  persisted: boolean
  saveStatus: "error" | "saving" | "draft" | "up-to-date"
  onNotice: (message: string) => void
}

export function PublicationControl({ token, projectId, projectRevision, persisted, saveStatus, onNotice }: Props) {
  const [publication, setPublication] = useState<Publication | null>(null)
  const [reviews, setReviews] = useState<PublicationReviewRequest[]>([])
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null)
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)
  const [mode, setMode] = useState<"closed" | "details" | "confirm">("closed")
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState("")
  const [directPublication, setDirectPublication] = useState(false)

  useEffect(() => {
    if (!token || !projectId) return
    let active = true
    void fetch("/api/ites/site/root", { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() as Promise<{ projectId: string; canPublishDirectly: boolean }> : null)
      .then(root => { if (active) setDirectPublication(root?.projectId === projectId && root.canPublishDirectly) })
      .catch(() => { if (active) setDirectPublication(false) })
    void getPublication(token, projectId)
      .then((result) => { if (active) setPublication(result) })
      .catch(() => { if (active) setPublication(null) })
      .finally(() => { if (active) setLoadedProjectId(projectId) })
    void Promise.all([listProjectRevisions(token, projectId, 0, 1), listPublicationReviewRequests(token, projectId)])
      .then(([history, requests]) => {
        if (!active) return
        setCurrentRevisionId(history.items[0]?.id ?? null)
        setReviews(requests)
      })
      .catch(() => { if (active) setReviews([]) })
    return () => { active = false }
  }, [token, projectId])

  const saved = persisted && saveStatus === "up-to-date"
  const current = publication?.versions.find((version) => version.number === publication.currentVersion)
  const changed = projectRevision !== undefined && current?.projectRevision !== projectRevision
  const currentReview = reviews.find((request) => request.operation === "PUBLISH"
    && request.projectRevisionId === currentRevisionId && !request.consumedAt)

  async function createReviewRequest() {
    if (!token || !projectId || !currentRevisionId || !saved || publishing) return
    setPublishing(true)
    setError("")
    try {
      const request = await requestPublicationReview(token, projectId, currentRevisionId, "PUBLISH")
      setReviews((items) => [request, ...items])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível solicitar a revisão.")
    } finally { setPublishing(false) }
  }

  async function decideReview(approved: boolean) {
    if (!token || !projectId || !currentReview?.canDecide || publishing) return
    setPublishing(true)
    setError("")
    try {
      const result = await decidePublicationReview(token, projectId, currentReview.id, approved)
      setReviews((items) => items.map((item) => item.id === result.id ? result : item))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível decidir a revisão.")
    } finally { setPublishing(false) }
  }

  async function publish() {
    if (!token || !projectId || !saved || publishing) return
    setPublishing(true)
    setError("")
    try {
      if (!directPublication && (!currentReview || currentReview.state !== "APPROVED")) throw new Error("Solicite e aguarde a aprovação de outra pessoa.")
      const result = await publishProject(token, projectId, directPublication ? null : currentReview!.id)
      setPublication(result)
      if (currentReview && !directPublication)
        setReviews((items) => items.map((item) => item.id === currentReview.id ? { ...item, consumedAt: new Date().toISOString() } : item))
      setMode("details")
      onNotice("Projeto publicado com sucesso.")
    } catch {
      setError("Não foi possível publicar. Tente novamente.")
    } finally { setPublishing(false) }
  }

  return <>
    <Button
      variant="secondary"
      size={publication ? "icon-sm" : "sm"}
      className={publication?.active ? "text-emerald-600 dark:text-emerald-400" : undefined}
      disabled={!persisted || loadedProjectId !== projectId || publishing}
      aria-label={publication ? "Informações da publicação" : "Publicar projeto"}
      title={publication ? "Informações da publicação" : "Publicar projeto"}
      onClick={() => { setError(""); setMode(publication ? "details" : "confirm") }}
    >
      <Globe2 aria-hidden="true" />{publication ? null : " Publicação"}
    </Button>
    <CenterMorphModal open={mode !== "closed"} onOpenChange={(open) => { if (!open && !publishing) setMode("closed") }}>
      <CenterMorphModalContent
        ariaLabel={mode === "confirm" ? "Confirmar publicação" : "Informações da publicação"}
        closeButtonLabel="Fechar publicação"
        className="builder-ui flex flex-col gap-5 bg-card p-6 text-foreground"
        backdropClassName="bg-black/60"
        dismissible={!publishing}
      >
        {mode === "confirm" ? <>
          <div><h2 className="text-lg font-semibold">{publication ? "Publicar nova versão?" : "Publicar projeto?"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{publication ? "A versão atual ficará disponível como ponto de recuperação por 30 dias." : "Seu site ficará acessível publicamente pelo link de publicação."}</p>
          </div>
          {!saved && <p className="text-sm text-amber-600">Aguarde o projeto terminar de salvar antes de publicar.</p>}
          {currentReview?.state === "PENDING" && <p className="text-sm text-muted-foreground">Solicitação de revisão da revisão {currentReview.projectRevision} pendente.</p>}
          {currentReview?.state === "APPROVED" && <p className="text-sm text-emerald-700">A revisão {currentReview.projectRevision} foi aprovada.</p>}
          {currentReview?.state === "REJECTED" && <p className="text-sm text-destructive">A solicitação foi rejeitada. Você pode solicitar uma nova revisão.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={publishing} onClick={() => setMode(publication ? "details" : "closed")}>Cancelar</Button>
            {currentReview?.state === "PENDING" && currentReview.canDecide ? <><Button variant="outline" disabled={publishing} onClick={() => void decideReview(false)}>Rejeitar revisão</Button><Button disabled={publishing} onClick={() => void decideReview(true)}>Aprovar revisão</Button></> : null}
            {directPublication ? <Button disabled={!saved || publishing} onClick={() => void publish()}>{publishing ? "Publicando…" : "Publicar projeto raiz"}</Button> : <>{(!currentReview || currentReview.state === "REJECTED" || currentReview.consumedAt) && <Button disabled={!saved || !currentRevisionId || publishing} onClick={() => void createReviewRequest()}>{publishing ? "Solicitando…" : "Solicitar revisão"}</Button>}{currentReview?.state === "APPROVED" && <Button disabled={!saved || publishing} onClick={() => void publish()}>{publishing ? "Publicando…" : "Publicar versão aprovada"}</Button>}</>}</div>
        </> : publication ? <>
          <div><h2 className="text-lg font-semibold">{publication.projectName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{publication.active ? "Publicado" : "Publicação pausada"} · Versão {publication.currentVersion}</p></div>
          <p className="text-sm">Publicado em {current ? new Date(current.publishedAt).toLocaleString("pt-BR") : "—"}</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to={webPaths.publications} className="text-primary underline" onClick={() => setMode("closed")}>Acompanhar na central de publicações</Link>
            <a href={directPublication ? "/" : publicUrl(publication.publicKey)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary underline">Abrir site publicado <ExternalLink aria-hidden="true" className="size-4" /></a>
          </div>
          <Button disabled={!saved || !changed} onClick={() => setMode("confirm")}>Publicar nova versão</Button>
          {!changed && <p className="text-xs text-muted-foreground">Faça e salve uma alteração para gerar outra versão.</p>}
        </> : null}
      </CenterMorphModalContent>
    </CenterMorphModal>
  </>
}
