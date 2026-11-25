import { ArrowRight } from "lucide-react"

import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import {
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"

function isCategory(item: ContentItem) {
  return item.value === "category"
}

export function CareersOpeningsBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const items = p.items ?? []
  const categories = items.filter(isCategory)

  return (
    <section className="builder-block builder-block--spacious bg-background">
      <div className="container mx-auto">
        <h1 className="text-3xl font-medium @md:text-4xl">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "title" }}
            value={p.title}
            label="título"
          />
        </h1>
        {p.description ? (
          <p className="mt-4 max-w-2xl text-muted-foreground">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "description" }}
              value={p.description}
              label="descrição"
              multiline
            />
          </p>
        ) : null}
        <div className="mt-10 flex flex-col gap-12 @md:mt-14 @4xl:gap-16">
          {categories.map((category) => {
            const openings = items.filter(
              (item) => item.value === "job" && item.features[0] === category.id
            )
            return (
              <section
                key={category.id}
                aria-labelledby={`category-${category.id}`}
              >
                <h2
                  id={`category-${category.id}`}
                  className="border-b pb-4 text-xl font-bold"
                >
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: category.id, key: "title" }}
                    value={category.title}
                    label="categoria de vagas"
                  />
                </h2>
                <ul>
                  {openings.map((job) => (
                    <li
                      key={job.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <a
                        href={safeHref(job.href)}
                        className="group pointer-events-auto flex items-center justify-between gap-4 py-4"
                        data-inline-editor-control=""
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold hover:underline">
                            <InlineText
                              editor={editor}
                              focusable={false}
                              target={{
                                kind: "item",
                                id: job.id,
                                key: "title",
                              }}
                              value={job.title}
                              label="cargo da vaga"
                            />
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            <InlineText
                              editor={editor}
                              focusable={false}
                              target={{
                                kind: "item",
                                id: job.id,
                                key: "description",
                              }}
                              value={job.description}
                              label="localização da vaga"
                            />
                          </span>
                        </span>
                        <ArrowRight
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}
