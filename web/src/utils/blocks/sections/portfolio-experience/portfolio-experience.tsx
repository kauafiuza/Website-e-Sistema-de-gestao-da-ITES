import { BriefcaseBusiness } from "lucide-react"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

export function PortfolioExperienceBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  return (
    <section id="experiencia" className="bg-muted/35 px-2 py-20 text-foreground sm:py-28">
      <header className="mb-12 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-primary"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo" /></p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" /></h2>
        <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" as="p" className="mt-4 text-base leading-7 text-muted-foreground" multiline />
      </header>
      <div className="relative ml-2 border-l border-border pl-7 sm:ml-4 sm:pl-10">
        {(p.items ?? []).map((item) => <article key={item.id} className="relative pb-10 last:pb-0">
          <span className="absolute -left-[2.27rem] top-0 flex size-8 items-center justify-center rounded-full border bg-background text-primary sm:-left-[3.02rem]"><BriefcaseBusiness size={15} aria-hidden="true" /></span>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "value" }} value={item.value} label="período" /></p>
          <h3 className="mt-2 text-xl font-semibold"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="organização" /></h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "description" }} value={item.description} label="cargo ou formação" /></p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{item.features.map((feature, index) => <li key={`${item.id}-${index}`} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" /><InlineText editor={editor} target={{ kind: "item-feature", id: item.id, index }} value={feature} label="detalhe" /></li>)}</ul>
        </article>)}
      </div>
    </section>
  )
}
