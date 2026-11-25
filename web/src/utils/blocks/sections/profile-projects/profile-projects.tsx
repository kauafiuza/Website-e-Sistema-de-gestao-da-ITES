import { useEffect, useState } from "react"
import { ArrowUpRight, Code2, Pin, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ButtonLink } from "@/components/motion/button/base"
import { MagneticButton } from "@/components/motion/button/magnetic"
import { Magnetic } from "@/components/motion/magnetic"
import { CenterMorphModal, CenterMorphModalClose, CenterMorphModalContent, CenterMorphModalTrigger } from "@/components/motion/center-morph-modal"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

type ApiStatus = "idle" | "loading" | "error" | "ready"
type RemoteItemsState = {
  requestKey: string
  items: ContentItem[] | null
  status: ApiStatus
  message: string
}

function safeApiUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : ""
  } catch {
    return ""
  }
}

function readPath(value: unknown, path: string): unknown {
  if (!path.trim()) return value
  return path.split(".").filter(Boolean).reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined
    return (current as Record<string, unknown>)[key]
  }, value)
}

function textValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value)
  return ""
}

function apiItems(payload: unknown, props: BlockProps): ContentItem[] {
  const source = readPath(payload, props.itemsApiPath ?? "")
  if (!Array.isArray(source)) throw new Error("O caminho informado não aponta para uma lista JSON.")
  const titleKey = props.itemsApiTitleKey || "name"
  const descriptionKey = props.itemsApiDescriptionKey || "description"
  const hrefKey = props.itemsApiHrefKey || "html_url"
  const valueKey = props.itemsApiValueKey || "language"
  const featuresKey = props.itemsApiFeaturesKey || "topics"
  return source.map((raw, index) => {
    const title = textValue(readPath(raw, titleKey)) || `Item ${index + 1}`
    const id = textValue(readPath(raw, "id")) || textValue(readPath(raw, hrefKey)) || `${index}-${title}`
    const rawFeatures = readPath(raw, featuresKey)
    const features = Array.isArray(rawFeatures)
      ? rawFeatures.map(textValue).filter(Boolean)
      : textValue(rawFeatures).split(/[,\n]/).map((feature) => feature.trim()).filter(Boolean)
    return {
      id,
      title,
      description: textValue(readPath(raw, descriptionKey)),
      href: textValue(readPath(raw, hrefKey)),
      value: textValue(readPath(raw, valueKey)),
      features,
    }
  })
}

export function ProfileProjectsBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const [showAllOnMobile, setShowAllOnMobile] = useState(false)
  const [remoteState, setRemoteState] = useState<RemoteItemsState | null>(null)
  const [reload, setReload] = useState(0)
  const endpoint = p.itemsApiUrl?.trim() ?? ""
  const url = endpoint ? safeApiUrl(endpoint) : ""
  const requestKey = JSON.stringify([
    endpoint, p.itemsApiPath, p.itemsApiTitleKey, p.itemsApiDescriptionKey,
    p.itemsApiHrefKey, p.itemsApiValueKey, p.itemsApiFeaturesKey, reload,
  ])
  const matchingRemoteState = remoteState?.requestKey === requestKey ? remoteState : null
  const apiStatus: ApiStatus = !endpoint ? "idle" : !url ? "error" : matchingRemoteState?.status ?? "loading"
  const apiMessage = !endpoint ? "" : !url ? "Use um endpoint HTTPS público." : matchingRemoteState?.message ?? ""
  const remoteItems = matchingRemoteState?.items ?? null

  useEffect(() => {
    if (!endpoint || !url) return
    const controller = new AbortController()
    fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`A API respondeu com status ${response.status}.`)
        return response.json() as Promise<unknown>
      })
      .then((payload) => {
        const items = apiItems(payload, p)
        setRemoteState({ requestKey, items, status: "ready", message: "" })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setRemoteState({
          requestKey,
          items: null,
          status: "error",
          message: error instanceof Error ? error.message : "Não foi possível carregar os projetos.",
        })
      })
    return () => controller.abort()
  }, [endpoint, url, requestKey, p])

  const items = remoteItems ?? (p.items ?? [])
  return (
    <section id="projetos" aria-label="Projetos" className="w-full min-w-0 max-w-full overflow-x-clip bg-background px-6 py-24 text-foreground sm:px-8 md:py-32 lg:px-12">
      <div className="mx-auto min-w-0 max-w-3xl">
        <header className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="min-w-0"><p className="break-words text-xs font-medium uppercase tracking-widest text-muted-foreground"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo da seção" /></p><h2 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" /></h2><InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" as="p" multiline className="mt-3 block max-w-lg break-words text-sm leading-6 text-muted-foreground" /></div>
          <div className="flex flex-wrap items-center gap-2">
            {p.button ? <Magnetic className="max-w-full"><ButtonLink href={safeHref(p.href)} target="_blank" rel="noreferrer noopener" variant="secondary" size="md" className="h-10 max-w-full"><InlineText editor={editor} target={{ kind: "property", key: "button" }} value={p.button} label="texto do link" /><ArrowUpRight size={15} aria-hidden="true" /></ButtonLink></Magnetic> : null}
            {endpoint ? <Button type="button" variant="ghost" size="icon" aria-label="Atualizar projetos pela API" title="Atualizar projetos pela API" disabled={apiStatus === "loading"} onClick={() => setReload((value) => value + 1)} className="size-10 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"><RotateCw size={15} className={apiStatus === "loading" ? "animate-spin" : ""} aria-hidden="true" /></Button> : null}
          </div>
        </header>
        {apiStatus === "loading" ? <p role="status" className="mt-4 text-xs text-muted-foreground">Carregando projetos pela API…</p> : null}
        {apiStatus === "error" ? <p role="status" className="mt-4 text-xs text-destructive">A lista salva continua visível. {apiMessage}</p> : null}
        {apiStatus === "ready" ? <p role="status" className="mt-4 text-xs text-muted-foreground">Projetos carregados da API externa.</p> : null}
        <div aria-label="Lista de projetos" aria-busy={apiStatus === "loading"} className="mt-10 columns-1 gap-5 sm:columns-2">
          {items.map((item, index) => {
            const featured = item.features.includes("Fixado")
            const topics = item.features.filter((feature) => feature !== "Fixado").slice(0, 3)
            return <div key={item.id} className={`mb-5 min-w-0 break-inside-avoid ${!showAllOnMobile && index >= 3 ? "hidden sm:block" : ""}`}>
              <CenterMorphModal>
                <CenterMorphModalTrigger><button type="button" className={`group flex h-full min-w-0 w-full max-w-full flex-col justify-between gap-4 overflow-hidden rounded-2xl border p-5 text-left text-card-foreground transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${featured ? "border-foreground/20 bg-foreground/[0.025] shadow-sm shadow-foreground/5" : "border-border bg-card"}`}>
                <div className="min-w-0"><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><h3 className="min-w-0 break-words font-medium text-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="projeto" /></h3>{featured ? <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-foreground/20 bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-medium text-foreground"><Pin size={12} aria-hidden="true" />Fixado</span> : null}</div><div className="flex max-w-[45%] shrink-0 flex-col items-end gap-1.5">{item.value ? <span className="max-w-full break-words rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "value" }} value={item.value} label="linguagem ou categoria" /></span> : null}</div></div><p className="mt-2 break-words text-sm leading-6 text-muted-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "description" }} value={item.description} label="descrição do projeto" /></p><div className="mt-3 flex flex-wrap gap-1.5">{topics.map((feature) => { const featureIndex = item.features.indexOf(feature); return <span key={`${item.id}-${featureIndex}`} className="max-w-full break-words rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"><InlineText editor={editor} target={{ kind: "item-feature", id: item.id, index: featureIndex }} value={feature} label="tecnologia ou tópico" /></span> })}</div></div>
                <span className="flex items-center justify-between border-t border-border pt-3 text-xs font-medium text-muted-foreground"><span className="text-foreground">Abrir detalhes</span><Code2 size={14} aria-hidden="true" /></span>
                </button></CenterMorphModalTrigger>
                <CenterMorphModalContent ariaLabel={`Detalhes do projeto ${item.title}`} className="max-h-[min(80vh,800px)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:p-8" backdropClassName="bg-background/70 backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{item.value || "Projeto"}</p>
                  <h2 className="mt-3 break-words text-2xl font-bold tracking-tight sm:text-3xl"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="projeto" /></h2>
                  <p className="mt-4 break-words text-sm leading-7 text-muted-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "description" }} value={item.description} label="descrição do projeto" /></p>
                  {topics.length ? <div className="mt-5 flex flex-wrap gap-2">{topics.map((feature) => { const featureIndex = item.features.indexOf(feature); return <span key={`${item.id}-${featureIndex}`} className="max-w-full break-words rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground"><InlineText editor={editor} target={{ kind: "item-feature", id: item.id, index: featureIndex }} value={feature} label="tecnologia ou tópico" /></span> })}</div> : null}
                  <div className="mt-8 flex flex-wrap items-center gap-3"><Magnetic className="max-w-full"><CenterMorphModalClose><ButtonLink href={safeHref(item.href)} target="_blank" rel="noreferrer noopener" variant="primary" size="md" className="max-w-full"><span className="truncate">Abrir repositório</span><ArrowUpRight size={15} aria-hidden="true" /></ButtonLink></CenterMorphModalClose></Magnetic><CenterMorphModalClose><button type="button" className="h-10 rounded-full border border-border px-5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Fechar</button></CenterMorphModalClose></div>
                </CenterMorphModalContent>
              </CenterMorphModal>
            </div>
          })}
        </div>
        {items.length > 3 ? <div className="mt-6 flex justify-center sm:hidden"><MagneticButton variant="outline" aria-controls="projetos" aria-expanded={showAllOnMobile} onClick={() => setShowAllOnMobile((value) => !value)}>{showAllOnMobile ? "Mostrar menos" : "Mostrar mais"}</MagneticButton></div> : null}
        {items.length === 0 && apiStatus === "ready" ? <p className="mt-6 text-sm text-muted-foreground">A API não retornou projetos para exibir.</p> : null}
      </div>
    </section>
  )
}
