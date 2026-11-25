import { ArrowUpRight, Layers, Sparkles } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/motion/card"
import { useId } from "react"

import type { BlockProps } from "@/utils/blocks/types"
import {
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"

const featureIcons = [Sparkles, Layers, ArrowUpRight]

export function FeaturesClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const heading = (
    <>
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
      <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
        <InlineText
          editor={editor}
          target={{ kind: "property", key: "description" }}
          value={p.description}
          label="descrição"
          multiline
        />
      </p>
    </>
  )
  const cards = p.items ?? []
  return (
    <section
      id={sectionId}
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${(p.alignment ?? "center") === "left" ? "text-left" : "text-center"}`}
    >
      {heading}
      {
        <div className={`mt-9 grid gap-4 text-left ${"@md:grid-cols-3"}`}>
          {cards.map((s, i) => {
            const FeatureIcon = featureIcons[i % featureIcons.length]
            return (
              <Card key={s.id}>
                <CardHeader>
                  <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FeatureIcon className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle>
                    <h3>
                      <InlineText
                        editor={editor}
                        target={{ kind: "item", id: s.id, key: "title" }}
                        value={s.title}
                        label="título do recurso"
                      />
                    </h3>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    <InlineText
                      editor={editor}
                      target={{ kind: "item", id: s.id, key: "description" }}
                      value={s.description}
                      label="descrição do recurso"
                      multiline
                    />
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      }
    </section>
  )
}
