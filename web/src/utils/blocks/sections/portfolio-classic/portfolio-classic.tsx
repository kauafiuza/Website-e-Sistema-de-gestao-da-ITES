import { ArrowUpRight } from "lucide-react"
import { useId } from "react"

import type { BlockProps } from "@/utils/blocks/types"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"

const MAX_PROJECTS = 2

export function PortfolioClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const projects = (p.items ?? []).slice(0, MAX_PROJECTS)

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

      <div className="mt-9 grid gap-8 text-left @md:grid-cols-2 @md:gap-6">
        {projects.map((project) => {
          const imageUrl = safeImageUrl(project.features[0] ?? "")
          const imageAlt = project.features[1] || project.title
          return (
            <article key={project.id} className="group min-w-0">
              <a
                href={safeHref(project.href)}
                className="block overflow-hidden rounded-xl border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Ver projeto: ${project.title}`}
              >
                {imageUrl ? (
                  <InlineImage
                    editor={editor}
                    target={{ kind: "item-feature", id: project.id, index: 0 }}
                    altTarget={{
                      kind: "item-feature",
                      id: project.id,
                      index: 1,
                    }}
                    url={project.features[0] ?? ""}
                    alt={imageAlt}
                    className="size-full !rounded-none"
                  >
                    <img
                      src={imageUrl}
                      alt={imageAlt}
                      width={800}
                      height={500}
                      loading="lazy"
                      className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </InlineImage>
                ) : (
                  <div className="aspect-[16/10] bg-muted" aria-hidden="true" />
                )}
              </a>
              <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <InlineText
                  editor={editor}
                  target={{ kind: "item", id: project.id, key: "description" }}
                  value={project.description}
                  label="categoria e data do projeto"
                />
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h3 className="text-lg font-medium">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: project.id, key: "title" }}
                    value={project.title}
                    label="título do projeto"
                  />
                </h3>
                <a
                  href={safeHref(project.href)}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View project{" "}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
