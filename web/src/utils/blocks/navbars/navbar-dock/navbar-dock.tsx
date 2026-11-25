import { BriefcaseBusiness, FileText, Layers3, Moon, Sun, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

const icons = { user: UserRound, briefcase: BriefcaseBusiness, layers: Layers3, "file-text": FileText } as const

function DockLink({ item, editor, smoothScroll }: { item: ContentItem; editor?: InlineEditor; smoothScroll: boolean }) {
  const Icon = icons[item.value as keyof typeof icons] ?? Layers3
  const href = safeHref(item.href)
  return <a href={href} data-editor-action="scroll" aria-label={item.title} title={item.title} onClick={(event) => {
    if (!smoothScroll || !href.startsWith("#")) return
    const target = document.querySelector(href)
    if (!(target instanceof HTMLElement)) return
    event.preventDefault()
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
  }} className="group/link flex min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-primary/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-w-14">
    <Icon size={18} aria-hidden="true" />
    <span className="max-w-20 truncate text-[10px] font-semibold"><InlineText editor={editor} focusable={false} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="link da navegação" /></span>
  </a>
}

export function NavbarDockBlock({ props: p, editor, preview = false }: { props: BlockProps; editor?: InlineEditor; preview?: boolean }) {
  const inlinePreview = preview
  return <nav aria-label="Navegação principal" className={inlinePreview ? "relative z-10 flex w-full justify-center px-3 py-3" : "pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 sm:bottom-6"}>
    <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-2xl border border-white/35 bg-background/80 p-1.5 shadow-[0_16px_60px_-24px_rgba(15,23,42,.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      {(p.items ?? []).map((item) => <DockLink key={item.id} item={item} editor={editor} smoothScroll={p.smoothScroll !== false} />)}
      {p.showThemeToggle ? <Button type="button" variant="ghost" size="icon" aria-label="Alternar tema" onClick={() => window.dispatchEvent(new Event("builder:toggle-theme"))}><Sun className="hidden size-4 dark:block" aria-hidden="true" /><Moon className="size-4 dark:hidden" aria-hidden="true" /></Button> : null}
    </div>
  </nav>
}
