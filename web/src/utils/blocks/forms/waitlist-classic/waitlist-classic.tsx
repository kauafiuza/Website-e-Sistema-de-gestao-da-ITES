import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { FormFields, defaultFormFields } from "@/utils/blocks/shared/FormFields"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

export function WaitlistClassicBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const sectionId = useId()
  const [submitted, setSubmitted] = useState(false)

  return (
    <section
      id={sectionId}
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${(p.alignment ?? "center") === "left" ? "text-left" : "text-center"}`}
    >
      <p className="mb-4 text-xs font-semibold tracking-[.18em] text-primary">
        <InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="texto acima do título" />
      </p>
      <h2 className="text-3xl font-semibold tracking-tight @md:text-5xl">
        <InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" />
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
        <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" multiline />
      </p>
      <form className="mx-auto mt-7 max-w-md text-left" onSubmit={(event) => { event.preventDefault(); setSubmitted(true) }}>
        <FieldGroup>
          <FormFields fields={p.formFields ?? defaultFormFields["waitlist-classic"]} />
          <Button type="submit">
            <InlineText editor={editor} focusable={false} target={{ kind: "property", key: "button" }} value={p.button} label="texto do botão" />
          </Button>
          {submitted && <p role="status" className="text-sm text-primary">Demonstração: o formulário foi validado localmente. Nenhuma mensagem foi enviada.</p>}
        </FieldGroup>
      </form>
    </section>
  )
}
