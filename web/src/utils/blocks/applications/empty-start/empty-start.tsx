import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"
import { safeHref } from "@/utils/blocks/shared/urls"

export function EmptyStartBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  return (
    <section className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"}`}>
      <header className={`mb-8 ${p.alignment === "center" ? "text-center" : "text-left"}`}>
        <p className="mb-3 text-xs tracking-widest text-primary">
          <InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="texto acima do título" />
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          <InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" />
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" multiline />
        </p>
      </header>
      <Empty>
        <EmptyHeader>
          <EmptyTitle><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título do estado vazio" /></EmptyTitle>
          <EmptyDescription><InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição do estado vazio" multiline /></EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button nativeButton={false} role="link" render={<a href={safeHref(p.href)} />}>
            <InlineText editor={editor} focusable={false} target={{ kind: "property", key: "button" }} value={p.button} label="texto do botão" />
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  )
}
