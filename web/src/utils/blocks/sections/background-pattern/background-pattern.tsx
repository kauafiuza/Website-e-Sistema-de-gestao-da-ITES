import { cn } from "cn"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"

export function BackgroundPatternBlock({props:p,editor}:{props:BlockProps;editor?:InlineEditor}) {
 return <section className={cn("builder-block relative isolate flex min-h-[36rem] items-center justify-center overflow-hidden bg-background",p.appearance==="tinted"&&"bg-secondary")}><div aria-hidden="true" className="absolute inset-0 -z-10 opacity-60" style={{backgroundImage:"radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--primary) 45%, transparent) 1px, transparent 0)",backgroundSize:"28px 28px",maskImage:"radial-gradient(ellipse at center, black 10%, transparent 75%)"}}/><div className="container mx-auto text-center"><p className="text-sm font-semibold uppercase tracking-widest text-primary"><InlineText editor={editor} target={{kind:"property",key:"eyebrow"}} value={p.eyebrow} label="rótulo" /></p><h2 className="mt-4 text-4xl font-bold tracking-tight @md:text-6xl"><InlineText editor={editor} target={{kind:"property",key:"title"}} value={p.title} label="título" /></h2><InlineText editor={editor} target={{kind:"property",key:"description"}} value={p.description} label="descrição" as="p" className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground" multiline/></div></section>
}
