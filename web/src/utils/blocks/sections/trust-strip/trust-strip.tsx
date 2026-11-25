import { RotateCcw, Shield, Star, Truck } from "lucide-react"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"

const icons={truck:Truck,return:RotateCcw,shield:Shield,star:Star}

export function TrustStripBlock({props:p,editor}:{props:BlockProps;editor?:InlineEditor}) {
  return <section className="builder-block border-y bg-muted/30 py-6"><div className="container mx-auto"><ul className="grid grid-cols-1 gap-5 @sm:grid-cols-2 @4xl:grid-cols-4 @4xl:gap-6">{(p.items??[]).map(item=>{const Icon=icons[item.value as keyof typeof icons]??Shield;return <li key={item.id} className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="font-medium leading-tight"><InlineText editor={editor} target={{kind:"item",id:item.id,key:"title"}} value={item.title} label="título do benefício" /></p><InlineText editor={editor} target={{kind:"item",id:item.id,key:"description"}} value={item.description} label="descrição do benefício" as="p" className="text-sm text-muted-foreground" /></div></li>})}</ul></div></section>
}
