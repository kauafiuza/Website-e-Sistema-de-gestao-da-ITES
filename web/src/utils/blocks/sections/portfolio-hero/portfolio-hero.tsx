import { ArrowDown, ArrowUpRight } from "lucide-react"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

export function PortfolioHeroBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const image = safeImageUrl(p.imageUrl ?? "")
  return (
    <section className="relative isolate flex min-h-[min(880px,100svh)] items-end overflow-hidden bg-[#071323] text-white">
      {image ? <InlineImage editor={editor} url={p.imageUrl ?? ""} alt={p.imageAlt ?? ""}><img src={image} alt={p.imageAlt ?? ""} fetchPriority="high" className="absolute inset-0 -z-20 size-full object-cover opacity-60" /></InlineImage> : null}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(5,15,34,.9)_0%,rgba(19,42,82,.54)_48%,rgba(30,12,78,.62)_100%)]" />
      <div className="mx-auto w-full max-w-7xl px-6 pb-20 pt-40 sm:px-10 sm:pb-28 lg:px-16">
        <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.24em] text-cyan-200"><span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_20px_#67e8f9]" /><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="especialidade" /></p>
        <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.03] tracking-[-.045em] sm:text-7xl lg:text-8xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" /></h1>
        <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="apresentação" as="p" multiline className="mt-7 max-w-xl text-base leading-7 text-white/75 sm:text-lg" />
        <a href={safeHref(p.href)} className="mt-9 inline-flex min-h-12 items-center gap-3 rounded-full border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:border-cyan-200/70 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">
          <InlineText editor={editor} focusable={false} target={{ kind: "property", key: "button" }} value={p.button} label="texto do botão" />
          <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>
      <a href="#sobre" aria-label="Rolar até sobre" className="absolute bottom-7 right-8 hidden size-11 items-center justify-center rounded-full border border-white/30 text-white/80 transition hover:bg-white/10 sm:flex"><ArrowDown size={18} aria-hidden="true" /></a>
    </section>
  )
}
