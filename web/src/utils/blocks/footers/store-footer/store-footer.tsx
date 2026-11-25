import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"

export function StoreFooterBlock({props:p,editor}:{props:BlockProps;editor?:InlineEditor}) {
 const [done,setDone]=useState(false); const items=p.items??[]
 const groups=items.filter(x=>x.value==="group"); const links=items.filter(x=>x.value==="link"||x.value==="social")
 return <footer className="builder-block builder-block--spacious border-t bg-background"><div className="container mx-auto"><div className="grid gap-10 @md:grid-cols-2 @lg:grid-cols-4"><div className="@lg:col-span-1"><h2 className="text-2xl font-semibold"><InlineText editor={editor} target={{kind:"property",key:"title"}} value={p.title} label="título" /></h2><InlineText editor={editor} target={{kind:"property",key:"description"}} value={p.description} label="descrição" as="p" className="mt-3 text-sm text-muted-foreground" multiline/><form className="mt-5 flex gap-2" onSubmit={e=>{e.preventDefault();setDone(true)}}><Input type="email" placeholder="Seu e-mail" required aria-label="Seu e-mail"/><Button type="submit">{done?"Inscrito":"Assinar"}</Button></form></div>{groups.map(group=><div key={group.id}><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">{group.title}</h3><ul className="space-y-3">{links.filter(x=>x.features[0]===group.id).map(link=><li key={link.id}><a className="text-sm text-muted-foreground hover:text-foreground" href={safeHref(link.href)}>{link.title}</a></li>)}</ul></div>)}</div><Separator className="my-8"/><div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>© {new Date().getFullYear()} <InlineText editor={editor} target={{kind:"property",key:"eyebrow"}} value={p.eyebrow} label="nome da loja" /></span><span>{items.filter(x=>x.value==="payment").map(x=>x.title).join(" · ")}</span></div></div></footer>
}
