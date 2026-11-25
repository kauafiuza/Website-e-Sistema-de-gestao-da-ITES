"use client"

import { useId, useState, type FormEvent } from "react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"

export function AcceptInviteBlock({props:p,editor}:{props:BlockProps;editor?:InlineEditor}) {
  const id=useId()
  const [submitted,setSubmitted]=useState(false)
  const items=p.items??[]
  const paragraphs=items.filter(item=>item.value==="parágrafo")
  const disclaimer=items.find(item=>item.value==="aviso")
  const privacy=items.find(item=>item.value==="link")
  const copyright=items.find(item=>item.value==="copyright")
  const footer=items.filter(item=>item.value==="footer")
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setSubmitted(true)}
  return <section className="builder-block builder-block--spacious bg-background"><div className="container mx-auto flex flex-col gap-10 @md:items-center @4xl:gap-16">
    <InlineImage editor={editor} url={p.imageUrl??""} alt={p.imageAlt??""} target={{kind:"property",key:"imageUrl"}} altTarget={{kind:"property",key:"imageAlt"}} className="w-48"><img src={p.imageUrl??""} alt={p.imageAlt??""} className="max-h-10 w-auto object-contain dark:invert" /></InlineImage>
    <div className="grid w-full gap-10 rounded-2xl border p-6 @md:p-10 @4xl:grid-cols-2 @4xl:gap-16 @4xl:p-16">
      <div className="flex flex-col justify-between gap-8 @4xl:order-1"><div className="flex flex-col gap-4"><h1 className="text-3xl font-bold tracking-tight @md:text-4xl"><InlineText editor={editor} target={{kind:"property",key:"title"}} value={p.title} label="título" /></h1>{paragraphs.map(item=><InlineText key={item.id} editor={editor} target={{kind:"item",id:item.id,key:"title"}} value={item.title} label="descrição do convite" as="p" className="text-sm leading-6 text-muted-foreground" multiline />)}</div></div>
      <div className="flex flex-col justify-between gap-8"><div className="flex flex-col gap-5"><Button type="button" variant="outline" className="pointer-events-auto w-full" data-inline-editor-control=""><span aria-hidden="true" className="font-bold">G</span>Continuar com Google</Button><Separator /><form onSubmit={submit}><FieldGroup><Field><FieldLabel htmlFor={`${id}-email`}>E-mail</FieldLabel><Input id={`${id}-email`} name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required /></Field><Button type="submit" className="pointer-events-auto w-full" data-inline-editor-control=""><InlineText editor={editor} target={{kind:"property",key:"button"}} value={p.button} label="texto do botão" focusable={false} /></Button>{submitted?<p role="status" className="text-sm text-muted-foreground">Demonstração local concluída. Nenhum convite foi enviado.</p>:null}</FieldGroup></form></div>{disclaimer?<p className="text-xs leading-5 text-muted-foreground"><InlineText editor={editor} target={{kind:"item",id:disclaimer.id,key:"title"}} value={disclaimer.title} label="aviso de privacidade" /> {privacy?<a href={safeHref(privacy.href)} className="pointer-events-auto underline" data-inline-editor-control=""><InlineText editor={editor} target={{kind:"item",id:privacy.id,key:"title"}} value={privacy.title} label="texto do link de privacidade" focusable={false} /></a>:null}.</p>:null}</div>
    </div>
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>{copyright?.title??""}</span>{footer.map(item=><a key={item.id} href={safeHref(item.href)} className="pointer-events-auto underline" data-inline-editor-control=""><InlineText editor={editor} target={{kind:"item",id:item.id,key:"title"}} value={item.title} label="link do rodapé" focusable={false} /></a>)}</footer>
  </div></section>
}
