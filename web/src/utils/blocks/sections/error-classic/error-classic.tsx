import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"
import { safeHref } from "@/utils/blocks/shared/urls"

export function ErrorClassicBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  return (
    <section className="builder-block bg-background">
      <div className="mx-auto max-w-4xl">
        <p className="mb-4 text-xs font-semibold tracking-widest text-primary">
          <InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="texto acima do título" />
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          <InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" />
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" multiline />
        </p>
        <div className="mt-8 rounded-2xl bg-muted p-12 text-center">
          <p className="text-7xl font-semibold text-primary">404</p>
          <p className="my-6">A página que você procura foi movida.</p>
          <a className="text-sm underline" href={safeHref(p.href)}>{p.button}</a>
        </div>
      </div>
    </section>
  )
}
