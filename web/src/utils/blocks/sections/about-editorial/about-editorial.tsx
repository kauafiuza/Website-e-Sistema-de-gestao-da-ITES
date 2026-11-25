import { useId } from "react"

import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"

const MAX_COLUMNS = 3
const MAX_IMAGES = 2
function isPhoto(item: ContentItem) {
  return item.features[0] === "photo"
}

export function AboutEditorialBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const allItems = p.items ?? []
  const gallery = allItems.filter(isPhoto).slice(0, MAX_IMAGES)
  const sections = allItems.filter((item) => !isPhoto(item))
  const columns = sections.slice(0, MAX_COLUMNS)
  const mission = sections[2]
  const values = sections[3]
  const secondImage = safeImageUrl(gallery[1]?.href ?? "")

  return (
    <section
      id={sectionId}
      className="builder-block builder-block--spacious bg-background"
    >
      <div className="container mx-auto">
        <div className="flex flex-col gap-16 @4xl:gap-28">
          <header className="flex flex-col gap-4 @4xl:gap-8">
            <h2 className="max-w-3xl text-4xl font-semibold tracking-tighter @4xl:text-7xl">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título"
              />
            </h2>
            {p.description ? (
              <p className="max-w-xl text-xl leading-relaxed text-muted-foreground">
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

          <div className="grid gap-6 @md:grid-cols-2">
            {gallery[0] ? (
              <InlineImage
                editor={editor}
                target={{ kind: "item", id: gallery[0].id, key: "href" }}
                altTarget={{
                  kind: "item-feature",
                  id: gallery[0].id,
                  index: 1,
                }}
                url={gallery[0].href}
                alt={gallery[0].features[1] || gallery[0].title}
              >
                <img
                  src={safeImageUrl(gallery[0].href)}
                  alt={gallery[0].features[1] || gallery[0].title}
                  width={960}
                  height={640}
                  loading="lazy"
                  className="aspect-[4/3] max-h-96 w-full rounded-2xl object-cover"
                />
              </InlineImage>
            ) : null}
            <div className="relative flex min-h-72 flex-col justify-between gap-10 overflow-hidden rounded-2xl bg-muted bg-cover bg-center p-8 @md:p-10">
              {secondImage ? (
                <InlineImage
                  editor={editor}
                  target={{ kind: "item", id: gallery[1].id, key: "href" }}
                  altTarget={{
                    kind: "item-feature",
                    id: gallery[1].id,
                    index: 1,
                  }}
                  url={gallery[1].href}
                  alt={gallery[1].features[1] || gallery[1].title}
                  className="absolute inset-0 !rounded-none"
                >
                  <img
                    src={secondImage}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover"
                  />
                </InlineImage>
              ) : null}
              <div className="absolute inset-0 bg-foreground/55" />
              <div className="relative flex h-full flex-col justify-between gap-10">
                {mission?.value ? (
                  <p className="flex items-center gap-2.5 text-sm font-semibold text-primary-foreground uppercase">
                    {mission.value}
                  </p>
                ) : null}
                {mission?.description ? (
                  <p className="text-lg font-medium text-primary-foreground">
                    <InlineText
                      editor={editor}
                      target={{
                        kind: "item",
                        id: mission.id,
                        key: "description",
                      }}
                      value={mission.description}
                      label="texto da missão"
                      multiline
                    />
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            <div className="flex max-w-xl flex-col gap-4">
              {values?.title ? (
                <h3 className="text-3xl font-semibold tracking-tight @md:text-5xl">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: values.id, key: "title" }}
                    value={values.title}
                    label="título dos valores"
                    multiline
                  />
                </h3>
              ) : null}
              {values?.description ? (
                <p className="text-lg text-muted-foreground">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: values.id, key: "description" }}
                    value={values.description}
                    label="descrição dos valores"
                    multiline
                  />
                </p>
              ) : null}
            </div>
            <div className="grid gap-8 @md:grid-cols-3 @md:gap-12">
              {columns.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 border-t border-border pt-6"
                >
                  <h4 className="text-lg font-semibold">
                    <InlineText
                      editor={editor}
                      target={{ kind: "item", id: item.id, key: "title" }}
                      value={item.title}
                      label="título da seção"
                      multiline
                    />
                  </h4>
                  <p className="text-muted-foreground">
                    <InlineText
                      editor={editor}
                      target={{ kind: "item", id: item.id, key: "description" }}
                      value={item.description}
                      label="conteúdo da seção"
                      multiline
                      className="line-clamp-4"
                    />
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
