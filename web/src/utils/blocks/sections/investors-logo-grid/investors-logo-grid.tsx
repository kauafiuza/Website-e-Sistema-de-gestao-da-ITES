import { useId } from "react"

import type { BlockProps } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"

const MAX_INVESTORS = 8

export function InvestorsLogoGridBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const investors = (p.items ?? []).slice(0, MAX_INVESTORS)

  return (
    <section id={sectionId} className="builder-block bg-background">
      <div className="container mx-auto">
        <div className="flex flex-col gap-12">
          <header className="flex flex-col items-center gap-3 text-center">
            {p.eyebrow ? (
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "eyebrow" }}
                  value={p.eyebrow}
                  label="rótulo"
                />
              </p>
            ) : null}
            {p.title ? (
              <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance @md:text-4xl">
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "title" }}
                  value={p.title}
                  label="título"
                />
              </h2>
            ) : null}
            {p.description ? (
              <p className="max-w-2xl text-muted-foreground">
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "description" }}
                  value={p.description}
                  label="descrição"
                  multiline
                />
              </p>
            ) : null}
          </header>

          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border @4xl:grid-cols-4">
            {investors.map((investor) => (
              <li
                key={investor.id}
                className="flex flex-col items-center justify-center gap-5 bg-background px-6 py-12"
              >
                <InlineImage
                  editor={editor}
                  target={{ kind: "item", id: investor.id, key: "href" }}
                  altTarget={{
                    kind: "item",
                    id: investor.id,
                    key: "description",
                  }}
                  url={investor.href}
                  alt={investor.description || investor.title}
                  className="!rounded-none"
                >
                  <img
                    src={safeImageUrl(investor.href)}
                    alt={investor.description || investor.title}
                    loading="lazy"
                    className="h-8 w-full max-w-36 object-contain"
                  />
                </InlineImage>
                <p className="text-sm font-medium">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: investor.id, key: "title" }}
                    value={investor.title}
                    label="nome da empresa"
                  />
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
