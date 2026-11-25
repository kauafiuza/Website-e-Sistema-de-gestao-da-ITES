import type { MouseEvent } from "react"
import { BookOpenText, BriefcaseBusiness, FolderGit2, House, Mail, UserRound } from "lucide-react"
import { FloatingDock } from "@/components/motion/floating-dock"
import { useSmoothScroll } from "@/components/motion/smooth-scroll"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

const dockIcons = { home: House, about: UserRound, experience: BriefcaseBusiness, projects: FolderGit2, contact: Mail, blog: BookOpenText } as const

function scrollToHref(event: MouseEvent<HTMLAnchorElement>, href: string, smoothScroll: boolean, scrollTo: ReturnType<typeof useSmoothScroll>["scrollTo"]) {
  if (!smoothScroll || !href.startsWith("#")) return
  const target = document.querySelector(href)
  if (!(target instanceof HTMLElement)) return
  event.preventDefault()
  scrollTo(target, { duration: 1.1 })
}

function DockItems({ items, editor, smoothScroll, scrollTo, onNavigate }: { items: ContentItem[]; editor?: InlineEditor; smoothScroll: boolean; scrollTo: ReturnType<typeof useSmoothScroll>["scrollTo"]; onNavigate?: () => void }) {
  return <>{items.map((item) => {
    const Icon = dockIcons[item.value as keyof typeof dockIcons] ?? FolderGit2
    const href = safeHref(item.href)
    return <a key={item.id} href={href} data-editor-action="scroll" aria-label={item.title} title={item.title} onClick={(event) => { scrollToHref(event, href, smoothScroll, scrollTo); onNavigate?.() }} className="group/dock-link relative grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <Icon size={20} aria-hidden="true" /><span className="absolute bottom-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow transition group-hover/dock-link:opacity-100 group-focus-visible/dock-link:opacity-100 md:block"><InlineText editor={editor} focusable={false} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="seção" /></span>
    </a>
  })}</>
}

export function EditorialDockNavbarBlock({ props: p, editor, preview = false }: { props: BlockProps; editor?: InlineEditor; preview?: boolean }) {
  const { scrollTo } = useSmoothScroll()
  const items = p.items ?? []
  if (preview) return <nav aria-label={p.title || "Navegação principal"} className="flex w-full min-w-0 max-w-full justify-center overflow-x-clip p-3"><div className="flex h-16 max-w-full min-w-0 items-end gap-3 overflow-x-auto rounded-2xl border border-border bg-card px-4 pb-3 shadow-lg"><DockItems items={items} editor={editor} smoothScroll={p.smoothScroll !== false} scrollTo={scrollTo} /></div></nav>
  return <nav aria-label={p.title || "Navegação principal"} className="pointer-events-none fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 flex justify-end px-4 [view-transition-name:persistent-nav] md:justify-center">
    <FloatingDock items={items.map((item) => { const Icon = dockIcons[item.value as keyof typeof dockIcons] ?? FolderGit2; return { id: item.id, title: item.title, href: safeHref(item.href), icon: <Icon className="size-full text-muted-foreground" aria-hidden="true" /> } })} className="pointer-events-auto" onNavigate={(href) => {
      if (href.startsWith("#") && p.smoothScroll !== false) {
        const target = document.querySelector(href)
        if (target instanceof HTMLElement) { scrollTo(target, { duration: 1.05 }); return }
      }
      window.location.assign(href)
    }} />
  </nav>
}
