import { useState } from "react"
import { ArrowUpRight, Atom, Braces, BriefcaseBusiness, Coffee, Container, Code2, Database, Download, Hexagon, Palette, Sprout, Wind } from "lucide-react"
import { ButtonLink } from "@/components/motion/button/base"
import { MagneticButton } from "@/components/motion/button/magnetic"
import { Magnetic } from "@/components/motion/magnetic"
import { CylinderCarousel } from "@/components/motion/cylinder-carousel"
import { TextReveal } from "@/components/motion/text-reveal"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

const profileIcons: Record<string, typeof Code2> = {
  github: Code2,
  linkedin: BriefcaseBusiness,
  cv: Download,
}

const skillVisuals: Record<string, { icon: typeof Code2; color: string }> = {
  java: { icon: Coffee, color: "#437291" },
  "spring boot": { icon: Sprout, color: "#6db33f" },
  "node.js": { icon: Hexagon, color: "#5fa04e" },
  python: { icon: Code2, color: "#3776ab" },
  react: { icon: Atom, color: "#61dafb" },
  typescript: { icon: Braces, color: "#3178c6" },
  "tailwind css": { icon: Wind, color: "#06b6d4" },
  mysql: { icon: Database, color: "#4479a1" },
  docker: { icon: Container, color: "#2496ed" },
  figma: { icon: Palette, color: "#f24e1e" },
}

function ProfileLink({ item, editor }: { item: ContentItem; editor?: InlineEditor }) {
  const Icon = profileIcons[item.value] ?? ArrowUpRight
  const isDownload = item.value === "cv"
  return <Magnetic><ButtonLink href={safeHref(item.href)} target={isDownload ? undefined : "_blank"} rel={isDownload ? undefined : "noreferrer noopener"} download={isDownload ? true : undefined} variant="outline" size="md" className="max-w-full">
    <Icon size={15} aria-hidden="true" /><InlineText editor={editor} focusable={false} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="link do perfil" />{!isDownload ? <ArrowUpRight size={13} aria-hidden="true" /> : null}
  </ButtonLink></Magnetic>
}

export function ProfileAboutBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const [expanded, setExpanded] = useState(false)
  const image = p.imageUrl?.trim() ? safeImageUrl(p.imageUrl) : ""
  const descriptionTarget = { kind: "property", key: "description" } as const
  const paragraphs = p.description.split(/\n\s*\n/).filter(Boolean)
  const introduction = paragraphs[0] ?? ""
  const expandedDescription = paragraphs.slice(1)
  const skills = (p.items ?? []).filter((item) => item.value === "skill")
  const links = (p.items ?? []).filter((item) => item.value !== "skill")
  return (
    <section id="sobre" className="w-full min-w-0 max-w-full overflow-x-clip bg-background px-6 py-24 text-foreground sm:px-8 md:py-32 lg:px-12">
      <div className="mx-auto min-w-0 max-w-3xl">
        <p className="break-words text-xs font-medium uppercase tracking-widest text-muted-foreground"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo da seção" /></p>
        <div className="mt-4 flex min-w-0 items-center gap-4 sm:gap-5">
          {image ? <InlineImage editor={editor} url={p.imageUrl || image} alt={p.imageAlt ?? ""} className="shrink-0 rounded-full"><img src={image} alt={p.imageAlt ?? ""} width={80} height={80} loading="lazy" className="size-16 rounded-full border border-border object-cover sm:size-20" /></InlineImage> : null}
          <div className="min-w-0"><h2 className="break-words text-3xl font-bold tracking-tight sm:text-4xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título da seção" /></h2><p className="mt-1 break-words text-sm font-medium text-muted-foreground">Incubadora Tecnológica de Economia Solidária · IFRJ Campus Niterói</p></div>
        </div>
        <div id="about-extra-text" className="relative mt-6 text-sm leading-7 text-muted-foreground sm:text-base">
        {editor ? <div className={`relative overflow-hidden ${expanded ? "max-h-none" : "max-h-14 sm:max-h-none"}`}><InlineText editor={editor} target={descriptionTarget} value={p.description} label="apresentação profissional" as="p" multiline className="block whitespace-pre-line" />{!expanded ? <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-background sm:hidden" /> : null}</div> : <div className="space-y-4">
            {introduction ? <TextReveal as="p" text={introduction} stagger={0.012} className="leading-7" /> : null}
            {expandedDescription.length ? <div className={`relative space-y-4 overflow-hidden ${expanded ? "max-h-none" : "max-h-14 sm:max-h-none"}`}>
              {expandedDescription.map((paragraph, index) => <TextReveal key={`${index}-${paragraph.slice(0, 24)}`} as="p" text={paragraph} delay={2 + index * 0.2} stagger={0.012} className="leading-7" />)}
              {!expanded ? <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-background sm:hidden" /> : null}
            </div> : null}
          </div>}
        </div>
        {expandedDescription.length && p.button ? <MagneticButton type="button" variant="ghost" size="sm" aria-controls="about-extra-text" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-2 px-0 text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary sm:hidden"><InlineText editor={editor} focusable={false} target={{ kind: "property", key: "button" }} value={expanded ? "Leia menos" : p.button} label="texto para expandir a apresentação" /></MagneticButton> : null}
        {skills.length ? <div className="relative mt-8 w-full min-w-0 overflow-hidden" aria-label="Tecnologias e ferramentas"><div className="min-w-0 p-2"><CylinderCarousel itemSize={96} visibleItems={5} minScale={0.65} autoRotate autoRotateSpeed={0.3}>{skills.map((item) => { const visual = skillVisuals[item.title.trim().toLowerCase()] ?? { icon: Code2, color: "var(--primary)" }; const Icon = visual.icon; return <div key={item.id} className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center"><Icon className="size-8 shrink-0" style={{ color: visual.color }} aria-hidden="true" /><span className="max-w-full break-words text-[11px] font-medium leading-tight text-muted-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="tecnologia ou ferramenta" /></span></div>})}</CylinderCarousel></div><div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent sm:w-12" /><div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent sm:w-12" /></div> : null}
        {links.length ? <div className="mt-8 flex min-w-0 flex-wrap gap-3">{links.map((item) => <ProfileLink key={item.id} item={item} editor={editor} />)}</div> : null}
      </div>
    </section>
  )
}
