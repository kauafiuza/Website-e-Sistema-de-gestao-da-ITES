import { ArrowUp } from "lucide-react"
import { useEffect, useState } from "react"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

export function BackToTopBlock({ props: p, editor, preview = false }: { props: BlockProps; editor?: InlineEditor; preview?: boolean }) {
  const [visible, setVisible] = useState(false)
  const inlinePreview = preview
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return <button type="button" data-editor-action="scroll" aria-label={p.button || "Voltar ao topo"} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} className={`${inlinePreview ? "relative mx-4 my-3" : "fixed bottom-24 right-4 sm:bottom-8 sm:right-8"} z-40 inline-flex size-11 items-center justify-center gap-2 rounded-full border bg-background/85 text-foreground shadow-lg backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${inlinePreview || visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
    <ArrowUp size={18} aria-hidden="true" />
    <span className="sr-only"><InlineText editor={editor} target={{ kind: "property", key: "button" }} value={p.button} label="texto alternativo" /></span>
  </button>
}
