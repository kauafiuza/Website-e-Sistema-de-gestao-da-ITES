import { ArrowUpRight } from "lucide-react"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

export function PortfolioAboutBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const image = safeImageUrl(p.imageUrl ?? "")
  return (
    <section id="sobre" className="bg-background px-2 py-20 text-foreground sm:py-28">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,.85fr)_1.15fr] md:gap-16">
        <div className="relative mx-auto w-full max-w-sm">
          <div aria-hidden="true" className="absolute -inset-3 -rotate-3 rounded-[2rem] bg-gradient-to-br from-cyan-300/35 via-blue-500/20 to-violet-500/30" />
          {image ? <InlineImage editor={editor} url={p.imageUrl ?? ""} alt={p.imageAlt ?? ""}><img src={image} alt={p.imageAlt ?? ""} loading="lazy" className="relative aspect-[4/5] w-full rounded-[1.75rem] object-cover" /></InlineImage> : null}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-primary"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo" /></p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" /></h2>
          <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="apresentação" as="p" multiline className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg" />
          <div className="mt-8 flex flex-wrap gap-2.5" aria-label="Tecnologias">
            {(p.items ?? []).map((item) => <span key={item.id} className="rounded-full border bg-card px-3.5 py-2 text-sm font-medium"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="tecnologia" /></span>)}
          </div>
          <a href={p.logoHref || "#"} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Ver perfil de código <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  )
}
