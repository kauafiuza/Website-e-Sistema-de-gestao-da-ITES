import { ArrowUpRight, BriefcaseBusiness, Code2, Mail, MoveUpRight } from "lucide-react"
import { ButtonLink } from "@/components/motion/button/base"
import { MagneticButton } from "@/components/motion/button/magnetic"
import { Magnetic } from "@/components/motion/magnetic"
import { useSmoothScroll } from "@/components/motion/smooth-scroll"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

const socialIcons = { github: Code2, linkedin: BriefcaseBusiness, mail: Mail } as const

export function InstitutionalContactBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const { scrollTo } = useSmoothScroll()
  return (
    <footer id="contato" className="relative w-full min-w-0 max-w-full overflow-x-clip bg-background px-6 pb-32 pt-24 text-foreground sm:px-8 md:pt-32 lg:px-12">
      <div className="mx-auto min-w-0 max-w-3xl">
        <div className="flex flex-col items-start gap-6 border-b border-border pb-16">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo da seção" /></p>
          <h2 className="min-w-0 max-w-2xl break-words text-3xl font-bold tracking-tight sm:text-5xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="chamada de contato" multiline /></h2>
          <Magnetic className="max-w-full"><ButtonLink href={safeHref(p.href)} variant="primary" size="lg" className="h-12 max-w-full break-all text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Mail size={16} aria-hidden="true" /><InlineText editor={editor} target={{ kind: "property", key: "button" }} value={p.button} label="e-mail ou texto do botão" /></ButtonLink></Magnetic>
        </div>
        <div className="flex flex-col gap-6 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 break-words text-sm text-muted-foreground"><InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="copyright" /></p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {(p.items ?? []).map((item) => { const Icon = socialIcons[item.value as keyof typeof socialIcons] ?? ArrowUpRight; return <a key={item.id} href={safeHref(item.href)} target={item.href.startsWith("mailto:") ? undefined : "_blank"} rel={item.href.startsWith("mailto:") ? undefined : "noreferrer noopener"} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><Icon size={16} aria-hidden="true" /><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="rede social" /></a> })}
            <MagneticButton type="button" data-editor-action="scroll" variant="ghost" size="sm" onClick={() => scrollTo(0, { duration: 1.1 })} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><MoveUpRight size={16} aria-hidden="true" /><span>Voltar ao topo</span></MagneticButton>
          </div>
        </div>
      </div>
    </footer>
  )
}
