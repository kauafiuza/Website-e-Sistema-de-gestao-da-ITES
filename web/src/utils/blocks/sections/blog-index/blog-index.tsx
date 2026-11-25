import { ArrowRight } from "lucide-react"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

export function BlogIndexBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  return (
    <section id="blog" className="bg-background px-2 py-20 text-foreground sm:py-28">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-primary"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo" /></p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" /></h1>
        <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" as="p" multiline className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg" />
      </header>
      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {(p.items ?? []).map((post, index) => {
          const image = safeImageUrl(post.value)
          const href = safeHref(post.href)
          return <article key={post.id} className={`group overflow-hidden rounded-2xl border bg-card ${index === 0 ? "md:col-span-2 xl:col-span-2" : ""}`}>
            <a href={href} className="block aspect-[16/9] overflow-hidden bg-muted">
              {image ? <InlineImage editor={editor} target={{ kind: "item", id: post.id, key: "value" }} altTarget={{ kind: "item-feature", id: post.id, index: 2 }} url={post.value} alt={post.features[2] ?? post.title}><img src={image} alt={post.features[2] ?? post.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.025]" /></InlineImage> : null}
            </a>
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wide text-primary"><InlineText editor={editor} target={{ kind: "item-feature", id: post.id, index: 1 }} value={post.features[1] ?? ""} label="categoria" /><span className="text-muted-foreground">·</span><InlineText editor={editor} target={{ kind: "item-feature", id: post.id, index: 0 }} value={post.features[0] ?? ""} label="data" /></div>
              <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight sm:text-2xl"><a href={href} className="hover:underline"><InlineText editor={editor} focusable={false} target={{ kind: "item", id: post.id, key: "title" }} value={post.title} label="título do artigo" /></a></h2>
              <InlineText editor={editor} target={{ kind: "item", id: post.id, key: "description" }} value={post.description} label="resumo" as="p" multiline className="mt-3 text-sm leading-6 text-muted-foreground" />
              <a href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Ler artigo <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </article>
        })}
      </div>
    </section>
  )
}
