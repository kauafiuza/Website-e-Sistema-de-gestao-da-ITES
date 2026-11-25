import { ArrowUpRight, Code2 } from "lucide-react"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

function ProjectCard({ item, editor }: { item: ContentItem; editor?: InlineEditor }) {
  const image = safeImageUrl(item.value)
  const repo = item.features[2] ? safeHref(item.features[2]) : ""
  return (
    <article className="group overflow-hidden rounded-2xl border bg-card transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
      <a href={safeHref(item.href)} target="_blank" rel="noreferrer" className="block aspect-[16/10] overflow-hidden bg-muted" aria-label={`Abrir projeto ${item.title}`}>
        {image ? <InlineImage editor={editor} target={{ kind: "item", id: item.id, key: "value" }} altTarget={{ kind: "item-feature", id: item.id, index: 0 }} url={item.value} alt={item.features[0] ?? item.title}><img src={image} alt={item.features[0] ?? item.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" /></InlineImage> : null}
      </a>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="projeto" /></h3>
            <p className="mt-1 text-sm text-muted-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "description" }} value={item.description} label="descrição" /></p>
          </div>
          <a href={repo || safeHref(item.href)} target="_blank" rel="noreferrer" aria-label={`Repositório de ${item.title}`} className="flex size-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition hover:text-foreground"><Code2 size={17} aria-hidden="true" /></a>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wide text-primary"><InlineText editor={editor} target={{ kind: "item-feature", id: item.id, index: 1 }} value={item.features[1] ?? ""} label="tecnologias" /></p>
        <a href={safeHref(item.href)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">Ver projeto <ArrowUpRight size={15} aria-hidden="true" /></a>
      </div>
    </article>
  )
}

export function PortfolioProjectsBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  return (
    <section id="projetos" className="bg-background px-2 py-20 text-foreground sm:py-28">
      <header className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-primary"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo" /></p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" /></h2>
          <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" as="p" className="mt-4 leading-7 text-muted-foreground" multiline />
        </div>
      </header>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{(p.items ?? []).map((item) => <ProjectCard key={item.id} item={item} editor={editor} />)}</div>
    </section>
  )
}
