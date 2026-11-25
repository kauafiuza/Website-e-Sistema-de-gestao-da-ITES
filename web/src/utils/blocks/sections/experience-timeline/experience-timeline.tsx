import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"

export function ExperienceTimelineBlock({props:p,editor}:{props:BlockProps;editor?:InlineEditor}) {
  return <section className="builder-block builder-block--spacious bg-background"><div className="container mx-auto flex flex-col gap-8 @4xl:gap-14">
    <header className="flex flex-col gap-4 @sm:flex-row @sm:items-end @sm:justify-between"><h1 className="text-4xl font-semibold tracking-tight @md:text-5xl"><InlineText editor={editor} target={{kind:"property",key:"title"}} value={p.title} label="título" /></h1><Button variant="ghost" size="lg" render={<a href={safeHref(p.href)} />} nativeButton={false}><InlineText editor={editor} target={{kind:"property",key:"button"}} value={p.button} label="texto do botão" focusable={false} /><Download className="size-4" aria-hidden="true" /></Button></header>
    <ul className="divide-y">{(p.items??[]).map((item)=><li key={item.id} className="grid gap-5 py-7 @md:grid-cols-[1fr_1fr_auto] @md:items-start @md:gap-8 @4xl:py-10"><p className="text-lg tracking-tight text-muted-foreground"><InlineText editor={editor} target={{kind:"item-feature",id:item.id,index:0}} value={item.features[0]??""} label="período" /></p><div className="flex flex-col gap-3"><h2 className="text-xl font-semibold"><InlineText editor={editor} target={{kind:"item",id:item.id,key:"title"}} value={item.title} label="cargo" /></h2><InlineText editor={editor} target={{kind:"item",id:item.id,key:"description"}} value={item.description} label="descrição da experiência" as="p" multiline className="text-muted-foreground" /></div><div className="flex items-center gap-2 @md:justify-end"><InlineImage editor={editor} url={item.href} alt={item.value} target={{kind:"item",id:item.id,key:"href"}} altTarget={{kind:"item",id:item.id,key:"value"}} className="size-6"><img src={safeImageUrl(item.href)} alt={item.value} className="size-6 object-contain dark:invert" /></InlineImage><span className="font-medium"><InlineText editor={editor} target={{kind:"item",id:item.id,key:"value"}} value={item.value} label="empresa" /></span></div></li>)}</ul>
  </div></section>
}
