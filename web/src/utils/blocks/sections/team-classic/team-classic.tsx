import { useId } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { BlockProps } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase()
}

export function TeamClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()

  return (
    <section
      id={sectionId}
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${(p.alignment ?? "center") === "left" ? "text-left" : "text-center"}`}
    >
      <header className="mx-auto max-w-3xl">
        <p className="mb-4 text-xs font-semibold tracking-[.18em] text-primary">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "eyebrow" }}
            value={p.eyebrow}
            label="texto acima do título"
          />
        </p>
        <h2 className="text-3xl font-semibold tracking-tight @md:text-5xl">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "title" }}
            value={p.title}
            label="título"
          />
        </h2>
        <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "description" }}
            value={p.description}
            label="descrição"
            multiline
          />
        </p>
      </header>

      <div className="mt-9 grid grid-cols-2 gap-5 text-left @md:grid-cols-4 @md:gap-6">
        {(p.items ?? []).map((member) => (
          <article key={member.id} className="min-w-0">
            <InlineImage
              editor={editor}
              target={{ kind: "item", id: member.id, key: "href" }}
              url={member.href}
              alt={member.title}
              className="w-full"
            >
              <Avatar className="aspect-[4/5] h-auto w-full rounded-xl border bg-muted @md:aspect-[3/4]">
                <AvatarImage
                  src={safeImageUrl(member.href)}
                  alt={member.title}
                  className="rounded-xl object-cover"
                />
                <AvatarFallback className="rounded-xl text-3xl font-medium text-muted-foreground">
                  {initials(member.title)}
                </AvatarFallback>
              </Avatar>
            </InlineImage>
            <h3 className="mt-4 font-medium">
              <InlineText
                editor={editor}
                target={{ kind: "item", id: member.id, key: "title" }}
                value={member.title}
                label="nome da pessoa"
              />
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              <InlineText
                editor={editor}
                target={{ kind: "item", id: member.id, key: "value" }}
                value={member.value}
                label="cargo"
              />
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
