import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FormFields, defaultFormFields } from "@/utils/blocks/shared/FormFields"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"

export function DemoRequestBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const [sent, setSent] = useState(false)
  const benefits = (p.items ?? []).filter((item) => item.value === "benefit")
  return <section className="builder-block builder-block--spacious bg-background">
    <div className="container mx-auto grid gap-12 @lg:grid-cols-2">
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo" /></p>
        <h2 className="mt-4 text-3xl font-semibold @md:text-5xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" /></h2>
        <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" as="p" className="mt-4 text-muted-foreground" multiline />
        <ul className="mt-8 space-y-4">{benefits.map((item) => <li key={item.id} className="flex gap-3"><ArrowRight className="mt-1 size-4 shrink-0 text-primary" /><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="benefício" /></li>)}</ul>
      </div>
      <Card className="p-6 @md:p-8"><form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); setSent(true) }}>
        <FormFields fields={p.formFields ?? defaultFormFields["demo-request"]} />
        <Button type="submit" className="w-full">{sent ? "Solicitação registrada" : p.button || "Solicitar demonstração"}</Button>
      </form></Card>
    </div>
  </section>
}
