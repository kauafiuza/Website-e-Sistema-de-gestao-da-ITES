import { useId } from "react"

import type { BlockProps } from "@/utils/blocks/types"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"

const MAX_GALLERY_ITEMS = 3

export function GalleryClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const items = (p.items ?? []).slice(0, MAX_GALLERY_ITEMS)

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

      <div className="mt-9 grid gap-5 text-left @md:grid-cols-2 @4xl:grid-cols-3">
        {items.map((item) => {
          const imageUrl = safeImageUrl(item.value)
          return (
            <a
              key={item.id}
              href={safeHref(item.href)}
              className="group min-w-0 overflow-hidden rounded-xl border bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {imageUrl ? (
                  <InlineImage
                    editor={editor}
                    target={{ kind: "item", id: item.id, key: "value" }}
                    url={item.value}
                    alt={item.title}
                    className="size-full !rounded-none"
                  >
                    <img
                      src={imageUrl}
                      alt={item.title}
                      width={640}
                      height={480}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </InlineImage>
                ) : null}
              </div>
              <div className="flex items-start justify-between gap-4 p-4 @md:p-5">
                <div className="min-w-0">
                  <h3 className="leading-snug font-medium">
                    <InlineText
                      editor={editor}
                      focusable={false}
                      target={{ kind: "item", id: item.id, key: "title" }}
                      value={item.title}
                      label="título da imagem"
                    />
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    <InlineText
                      editor={editor}
                      focusable={false}
                      target={{ kind: "item", id: item.id, key: "description" }}
                      value={item.description}
                      label="descrição da imagem"
                    />
                  </p>
                </div>
                <span
                  className="shrink-0 text-sm text-muted-foreground transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}
