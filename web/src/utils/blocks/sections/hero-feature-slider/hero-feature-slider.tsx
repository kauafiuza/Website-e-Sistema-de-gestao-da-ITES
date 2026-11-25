import { Braces, Cpu, Keyboard, type LucideIcon } from "lucide-react"
import { useId, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"

const MAX_FEATURES = 3
const featureIcons: Record<string, LucideIcon> = {
  braces: Braces,
  cpu: Cpu,
  keyboard: Keyboard,
}

function itemType(item: ContentItem) {
  return item.features[0]
}

export function HeroFeatureSliderBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const [activeImageIndex, setAtivoImageIndex] = useState(0)
  const items = p.items ?? []
  const features = items
    .filter((item) => itemType(item) === "feature")
    .slice(0, MAX_FEATURES)
  const images = items.filter((item) => itemType(item) === "image")
  const visibleImageCount = Math.max(features.length, 1)
  const activeIndex = Math.min(activeImageIndex, visibleImageCount - 1)

  return (
    <section
      id={sectionId}
      className="builder-block builder-block--spacious overflow-hidden bg-background"
    >
      <div className="container mx-auto">
        <header className="mb-16 flex flex-col items-center gap-6 text-center @4xl:mb-20">
          {p.eyebrow ? <Badge variant="outline">{p.eyebrow}</Badge> : null}
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-pretty @md:text-5xl">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "title" }}
              value={p.title}
              label="título principal"
            />
          </h1>
        </header>

        <div className="relative mx-auto max-w-5xl">
          <div className="relative aspect-video max-h-[500px] w-full overflow-hidden rounded-xl border bg-muted">
            {Array.from({ length: visibleImageCount }, (_, index) => {
              const image = images[Math.min(index, images.length - 1)]
              if (!image) return null
              const lightUrl = safeImageUrl(image.href)
              const darkUrl = safeImageUrl(image.features[1] ?? "")
              const alt = image.features[2] || image.title
              const isAtivo = activeIndex === index

              return (
                <div
                  key={`${image.id}-${index}`}
                  className={`absolute inset-0 transition-opacity duration-500 ease-out ${isAtivo ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
                  aria-hidden={!isAtivo}
                >
                  {lightUrl ? (
                    <InlineImage
                      editor={editor}
                      target={{ kind: "item", id: image.id, key: "href" }}
                      altTarget={{
                        kind: "item-feature",
                        id: image.id,
                        index: 2,
                      }}
                      url={image.href}
                      alt={alt}
                      className="absolute inset-0 !rounded-none"
                    >
                      <img
                        src={lightUrl}
                        alt={alt}
                        width={1280}
                        height={720}
                        loading="lazy"
                        className={`size-full object-cover object-top ${darkUrl ? "dark:hidden" : ""}`}
                      />
                    </InlineImage>
                  ) : null}
                  {darkUrl ? (
                    <InlineImage
                      editor={editor}
                      target={{ kind: "item-feature", id: image.id, index: 1 }}
                      altTarget={{
                        kind: "item-feature",
                        id: image.id,
                        index: 2,
                      }}
                      url={image.features[1] ?? ""}
                      alt={alt}
                      className="absolute inset-0 hidden !rounded-none dark:block"
                    >
                      <img
                        src={darkUrl}
                        alt={alt}
                        width={1280}
                        height={720}
                        loading="lazy"
                        className="size-full object-cover object-top"
                      />
                    </InlineImage>
                  ) : null}
                </div>
              )
            })}
            <div className="pointer-events-none absolute inset-0 z-20 rounded-xl bg-linear-to-t from-background via-transparent to-transparent" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-28 -right-28 -z-10 aspect-video h-72 w-96 mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_20%,transparent_100%)] bg-size-[12px_12px] opacity-40 sm:bg-[radial-gradient(hsl(var(--muted-foreground))_1px,transparent_1px)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-28 -left-28 -z-10 aspect-video h-72 w-96 mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_20%,transparent_100%)] bg-size-[12px_12px] opacity-40 sm:bg-[radial-gradient(hsl(var(--muted-foreground))_1px,transparent_1px)]"
            />
          </div>
        </div>

        <div
          className="pointer-events-auto mx-auto mt-8 flex max-w-5xl flex-col md:flex-row"
          data-inline-editor-control=""
          onMouseLeave={() => setAtivoImageIndex(0)}
        >
          {features.map((feature, index) => {
            const FeatureIcon = featureIcons[feature.value] ?? Braces
            return (
              <div className="contents" key={feature.id}>
                {index > 0 ? (
                  <Separator
                    orientation="vertical"
                    className="mx-6 hidden h-auto w-0.5 bg-linear-to-b from-muted via-transparent to-muted md:block"
                  />
                ) : null}
                <button
                  type="button"
                  className="pointer-events-auto flex grow basis-0 flex-col rounded-md bg-background p-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  data-inline-editor-control=""
                  aria-pressed={activeIndex === index}
                  onMouseEnter={() => setAtivoImageIndex(index)}
                  onFocus={() => setAtivoImageIndex(index)}
                  onClick={() => setAtivoImageIndex(index)}
                >
                  <span className="mb-6 flex size-10 items-center justify-center rounded-full border bg-card shadow-sm">
                    <FeatureIcon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mb-2 font-semibold tracking-tight text-foreground">
                    <InlineText
                      editor={editor}
                      focusable={false}
                      target={{ kind: "item", id: feature.id, key: "title" }}
                      value={feature.title}
                      label="título do recurso"
                    />
                  </span>
                  <span className="text-sm text-balance text-muted-foreground">
                    <InlineText
                      editor={editor}
                      focusable={false}
                      target={{
                        kind: "item",
                        id: feature.id,
                        key: "description",
                      }}
                      value={feature.description}
                      label="descrição do recurso"
                      multiline
                    />
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
