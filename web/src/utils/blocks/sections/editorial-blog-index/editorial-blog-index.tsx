import { useMemo, useState } from "react"
import { useSmoothScroll } from "@/components/motion/smooth-scroll"
import { ButtonLink } from "@/components/motion/button/base"
import { ArrowLeft, ArrowUpRight, CalendarDays, ChevronUp, FileText, FolderOpen, Home } from "lucide-react"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { BlockFrame, blockFrameStyle } from "@/utils/blocks/shared/BlockFrame"
import { ExpandableTabs, type ExpandableTabsItem } from "@/components/motion/expandable-tabs"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

export function EditorialBlogIndexBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [readingDockActive, setReadingDockActive] = useState<string | null>(null)
  const { scrollTo } = useSmoothScroll()
  const categories = useMemo(() => p.showArticleCategories === false ? [] : [...new Set((p.items ?? []).map((post) => post.features[1]?.trim()).filter((category): category is string => Boolean(category)))], [p.items, p.showArticleCategories])
  const filterTabs = useMemo<ExpandableTabsItem[]>(() => [
    { id: "all", label: "Todos", icon: <FileText className="size-4" aria-hidden="true" />, content: <p className="text-sm font-medium text-foreground">Todos os artigos</p> },
    ...categories.map((category) => ({ id: category, label: category, icon: <FolderOpen className="size-4" aria-hidden="true" />, content: <p className="text-sm font-medium text-foreground">Artigos de {category}</p> })),
  ], [categories])
  const visiblePosts = activeCategory ? (p.items ?? []).filter((post) => post.features[1]?.trim() === activeCategory) : p.items ?? []
  const frameStyle = blockFrameStyle(p)
  const contentStyle = p.layoutWidth === "full"
    ? { ...frameStyle, maxWidth: "760px" }
    : frameStyle
  const logo = safeImageUrl(p.brandLogoUrl ?? "")
  const articleLayout = p.articleLayout ?? "list"
  const showImages = p.showArticleImages !== false
  const showDates = p.showArticleDates !== false
  const showCategories = p.showArticleCategories !== false
  const showSummaries = p.showArticleSummaries !== false
  return (
    <BlockFrame props={{ ...p, layoutWidth: "full", layoutGutter: 0 }}>
      <section id="blog" className="w-full min-w-0 max-w-full overflow-x-clip bg-background px-6 py-24 text-foreground sm:px-8 md:py-32 lg:px-12">
        <div id="artigos" className="min-w-0 max-w-full" style={contentStyle}>
          <header className="mb-12 flex min-w-0 items-center justify-between gap-4">
          <a href={safeHref(p.brandLogoHref || "/")} aria-label={p.brandLogoText || p.brandLogoAlt || "Página inicial"} className="inline-flex min-h-9 min-w-0 max-w-full items-center gap-2 rounded-sm text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Home className="size-4 shrink-0" aria-hidden="true" />
            {logo ? <img src={logo} alt={p.brandLogoAlt ?? ""} className="max-h-10 max-w-40 object-contain" /> : null}
            {p.brandLogoText ? <span className="truncate">{p.brandLogoText}</span> : null}
          </a>
          {p.button ? <ButtonLink href={safeHref(p.href)} variant="outline" size="sm" className="shrink-0"><ArrowLeft className="size-4" aria-hidden="true" />{p.button}</ButtonLink> : null}
          </header>
          <header className="min-w-0 max-w-3xl">
            <p className="break-words text-xs font-medium uppercase tracking-widest text-muted-foreground"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo da seção" /></p>
            <h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-4xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título do blog" /></h1>
            <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="apresentação do blog" as="p" multiline className="mt-3 block max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7" />
          </header>

          {filterTabs.length > 1 ? <div className="mt-8 max-w-full overflow-x-auto"><ExpandableTabs items={filterTabs} value={activeCategory} onValueChange={(value) => setActiveCategory(value === "all" ? null : value)} className="max-w-full" /></div> : null}

          <div className={articleLayout === "grid" ? "mt-10 grid min-w-0 max-w-full grid-cols-1 gap-5 sm:grid-cols-2" : "mt-10 min-w-0 max-w-full divide-y divide-border border-y border-border"}>
            {visiblePosts.map((post) => {
              const image = safeImageUrl(post.value)
              const href = safeHref(post.href)
              return (
                <article key={post.id} className={articleLayout === "grid" ? "group flex min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-border bg-card" : "group grid min-w-0 max-w-full gap-5 py-6 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:gap-8 sm:py-8"}>
                  {showImages && image ? <a href={href} tabIndex={-1} aria-hidden="true" className={articleLayout === "grid" ? "block aspect-[16/10] overflow-hidden bg-secondary" : "order-1 block aspect-[16/10] overflow-hidden rounded-xl border border-border bg-secondary sm:order-2 sm:aspect-[4/3]"}>
                    <InlineImage editor={editor} target={{ kind: "item", id: post.id, key: "value" }} altTarget={{ kind: "item-feature", id: post.id, index: 2 }} url={post.value} alt={post.features[2] ?? post.title} className="block size-full"><img src={image} alt={post.features[2] ?? post.title} loading="lazy" className="size-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.035] group-hover:opacity-100" /></InlineImage>
                  </a> : null}
                  <div className={articleLayout === "grid" ? "flex min-w-0 flex-1 flex-col break-words p-5 sm:p-6" : "order-2 min-w-0 break-words sm:order-1"}>
                    {showDates || showCategories ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                      {showDates ? <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" /><InlineText editor={editor} target={{ kind: "item-feature", id: post.id, index: 0 }} value={post.features[0] ?? ""} label="data de publicação" /></span> : null}
                      {showDates && showCategories && post.features[1] ? <span aria-hidden="true">·</span> : null}
                      {showCategories && post.features[1] ? <InlineText editor={editor} target={{ kind: "item-feature", id: post.id, index: 1 }} value={post.features[1]} label="categoria" /> : null}
                    </div> : null}
                    <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-card-foreground sm:text-xl"><a href={href} className="transition-colors group-hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><InlineText editor={editor} focusable={false} target={{ kind: "item", id: post.id, key: "title" }} value={post.title} label="título do artigo" /></a></h2>
                    {showSummaries ? <InlineText editor={editor} target={{ kind: "item", id: post.id, key: "description" }} value={post.description} label="resumo do artigo" as="p" multiline className={`mt-3 block max-w-2xl text-sm leading-6 text-muted-foreground ${editor ? "" : "[display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"}`} /> : null}
                    <a href={href} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Ler conteúdo <ArrowUpRight size={13} aria-hidden="true" /></a>
                  </div>
                </article>
              )
            })}
          </div>
          {visiblePosts.length ? <div className="mt-14 min-w-0 space-y-16 border-t border-border pt-12">
            {visiblePosts.map((post) => {
              const href = safeHref(post.href)
              return <article key={`article-${post.id}`} id={href.startsWith("#") ? href.slice(1) : post.id} className="min-w-0 scroll-mt-10 border-b border-border pb-12">
                <h2 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl"><InlineText editor={editor} target={{ kind: "item", id: post.id, key: "title" }} value={post.title} label="título do artigo" /></h2>
                <InlineText editor={editor} target={{ kind: "item-feature", id: post.id, index: 3 }} value={post.features[3] || post.description} label="conteúdo do artigo" as="p" multiline className="mt-4 block whitespace-pre-line break-words text-base leading-8 text-muted-foreground" />
              </article>
            })}
          </div> : null}
          {(p.items ?? []).length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Adicione artigos para preencher esta página.</p> : null}
          {!editor ? <nav aria-label="Navegação de leitura" className="fixed right-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50"><ExpandableTabs items={[{ id: "top", label: "Topo", icon: <ChevronUp className="size-4" aria-hidden="true" />, content: <div className="w-44 px-1 py-0.5"><p className="text-sm font-semibold text-foreground">Topo</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Voltar para a listagem de textos.</p></div> }]} value={readingDockActive} onValueChange={(id) => { setReadingDockActive(id); if (!id) return; scrollTo(0, { duration: 1.1 }); window.setTimeout(() => setReadingDockActive(null), 1600) }} className="shadow-lg shadow-black/10" /></nav> : null}
        </div>
      </section>
    </BlockFrame>
  )
}
