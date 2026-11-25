import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"

const icons = { email: Mail, office: MapPin, phone: Phone, chat: MessageCircle }

export function ContactChannelsBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  return (
    <section className="builder-block builder-block--spacious bg-background">
      <div className="container mx-auto flex flex-col gap-8">
        <header className="flex max-w-2xl flex-col gap-3">
          <h1 className="text-4xl font-medium tracking-tight @md:text-5xl">
            <InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" />
          </h1>
          <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" as="p" className="text-muted-foreground" />
        </header>
        <div className="grid gap-4 @md:grid-cols-2">
          {(p.items ?? []).map((item) => {
            const Icon = icons[item.value as keyof typeof icons] ?? Mail
            return (
              <article key={item.id} className="flex flex-col gap-3 rounded-xl bg-muted/50 p-6 @4xl:p-8">
                <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-medium"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="canal de contato" /></h2>
                <InlineText editor={editor} target={{ kind: "item", id: item.id, key: "description" }} value={item.description} label="descrição do canal" as="p" className="text-sm text-muted-foreground" />
                <a className="pointer-events-auto mt-auto w-fit underline-offset-4 hover:underline" href={safeHref(item.href)} data-inline-editor-control="">
                  <InlineText editor={editor} target={{ kind: "item-feature", id: item.id, index: 0 }} value={item.features[0] ?? item.title} label="informação de contato" focusable={false} />
                </a>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
