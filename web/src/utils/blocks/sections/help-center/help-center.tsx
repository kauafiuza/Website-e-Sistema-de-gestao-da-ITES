import { ChevronRight, CreditCard, Package, RotateCcw, ShoppingBag, Truck, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"

const icons={package:Package,truck:Truck,return:RotateCcw,payment:CreditCard,user:User,product:ShoppingBag}
export function HelpCenterBlock({props:p,editor}:{props:BlockProps;editor?:InlineEditor}) {
  const items=p.items??[]
  return <section className="builder-block builder-block--spacious bg-background"><div className="container mx-auto max-w-4xl flex flex-col gap-8">
    <header className="flex flex-col items-center gap-3 text-center"><h1 className="text-4xl font-semibold tracking-tight @md:text-5xl"><InlineText editor={editor} target={{kind:"property",key:"title"}} value={p.title} label="título" /></h1><InlineText editor={editor} target={{kind:"property",key:"description"}} value={p.description} label="descrição" as="p" className="text-muted-foreground" /></header>
    <div className="grid gap-3 @sm:grid-cols-2 @4xl:grid-cols-3">{items.filter(i=>i.value==="category").map(item=>{const Icon=icons[item.features[0] as keyof typeof icons]??Package;return <Card key={item.id} className="group p-0 transition-colors hover:bg-muted/50"><CardContent className="flex gap-3 p-4"><Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="font-medium"><InlineText editor={editor} target={{kind:"item",id:item.id,key:"title"}} value={item.title} label="categoria" /></h2><ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /></div><InlineText editor={editor} target={{kind:"item",id:item.id,key:"description"}} value={item.description} label="descrição da categoria" as="p" className="mt-1 text-sm text-muted-foreground" /><p className="mt-1.5 text-xs text-muted-foreground">{item.features[1]??"0"} artigos</p></div></CardContent></Card>})}</div>
    <div className="rounded-xl bg-muted/50 p-6"><h2 className="mb-3 text-lg font-medium">Tópicos populares</h2><ul className="grid @sm:grid-cols-2 @4xl:grid-cols-3">{items.filter(i=>i.value==="topic").map(item=><li key={item.id}><a href={safeHref(item.href)} className="pointer-events-auto flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-background" data-inline-editor-control=""><ChevronRight className="size-4 shrink-0 text-muted-foreground" /><InlineText editor={editor} target={{kind:"item",id:item.id,key:"title"}} value={item.title} label="tópico popular" focusable={false} /></a></li>)}</ul></div>
    <footer className="flex flex-col items-center gap-3 text-center"><p className="text-sm text-muted-foreground">Não encontrou o que precisava?</p><Button render={<a href={safeHref(p.href)} />} nativeButton={false}><InlineText editor={editor} target={{kind:"property",key:"button"}} value={p.button} label="texto do botão" focusable={false} /></Button></footer>
  </div></section>
}
