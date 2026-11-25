import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"

export function TestimonialQuoteBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const item = p.items?.[0]
  const author = item?.title ?? "Pessoa cliente"
  const role = item?.value ?? "Cargo ou empresa"
  const avatarAlt = item?.features?.[0] ?? author
  const avatarUrl = item?.href || p.imageUrl || ""

  return (
    <section className="builder-block builder-block--spacious bg-background">
      <div className="container mx-auto">
        <figure className="flex flex-col items-center text-center">
          <blockquote className="mb-12 max-w-4xl px-4 text-xl font-medium @md:text-3xl">
            “<InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="depoimento" multiline />”
          </blockquote>
          <figcaption className="flex items-center gap-3">
            <InlineImage editor={editor} url={avatarUrl} alt={avatarAlt} target={item ? { kind: "item", id: item.id, key: "href" } : { kind: "property", key: "imageUrl" }} altTarget={item ? { kind: "item-feature", id: item.id, index: 0 } : { kind: "property", key: "imageAlt" }} className="size-12 rounded-full @md:size-16">
              <Avatar className="size-12 @md:size-16">
                <AvatarImage src={safeImageUrl(avatarUrl)} alt={avatarAlt} />
                <AvatarFallback>{author.slice(0, 2)}</AvatarFallback>
              </Avatar>
            </InlineImage>
            <div className="text-left">
              <p className="text-sm font-medium @md:text-base">
                <InlineText editor={editor} target={item ? { kind: "item", id: item.id, key: "title" } : { kind: "property", key: "title" }} value={author} label="nome da pessoa autora" />
              </p>
              <p className="text-sm text-muted-foreground @md:text-base">
                <InlineText editor={editor} target={item ? { kind: "item", id: item.id, key: "value" } : { kind: "property", key: "eyebrow" }} value={role} label="cargo ou empresa" />
              </p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
