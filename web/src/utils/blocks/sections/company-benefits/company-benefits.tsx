import { useId } from "react"

import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"

const MAX_IMAGES = 1
const MAX_RATINGS = 2

function itemType(item: ContentItem) {
  return item.features[0]
}

export function CompanyBenefitsBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const items = p.items ?? []
  const photo = items
    .filter((item) => itemType(item) === "photo")
    .slice(0, MAX_IMAGES)[0]
  const testimonial = items.find((item) => itemType(item) === "testimonial")
  const ratings = items
    .filter((item) => itemType(item) === "rating")
    .slice(0, MAX_RATINGS)

  return (
    <section id={sectionId} className="builder-block bg-background">
      <div className="container mx-auto">
        <div className="grid items-stretch gap-10 @4xl:grid-cols-2 @4xl:gap-16">
          {photo ? (
            <div className="relative @4xl:h-full">
              <InlineImage
                editor={editor}
                target={{ kind: "item", id: photo.id, key: "href" }}
                altTarget={{ kind: "item", id: photo.id, key: "title" }}
                url={photo.href}
                alt={photo.title}
                className="@4xl:absolute @4xl:inset-0 @4xl:size-full"
              >
                <img
                  src={safeImageUrl(photo.href)}
                  alt={photo.title}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-xl object-cover @4xl:aspect-auto @4xl:size-full"
                />
              </InlineImage>
            </div>
          ) : null}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance @md:text-5xl">
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "title" }}
                  value={p.title}
                  label="título"
                />
              </h2>
              <p className="max-w-5xl text-lg text-muted-foreground">
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "description" }}
                  value={p.description}
                  label="descrição"
                  multiline
                />
              </p>
            </div>

            {testimonial ? (
              <figure className="flex flex-col gap-5">
                <blockquote className="max-w-3xl text-2xl font-medium tracking-tight text-balance">
                  <InlineText
                    editor={editor}
                    target={{
                      kind: "item",
                      id: testimonial.id,
                      key: "description",
                    }}
                    value={testimonial.description}
                    label="depoimento"
                    multiline
                  />
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  {safeImageUrl(testimonial.href) ? (
                    <InlineImage
                      editor={editor}
                      target={{ kind: "item", id: testimonial.id, key: "href" }}
                      url={testimonial.href}
                      alt={testimonial.title}
                      className="size-10 shrink-0 !rounded-full"
                    >
                      <img
                        src={safeImageUrl(testimonial.href)}
                        alt=""
                        loading="lazy"
                        className="size-10 rounded-full object-cover"
                      />
                    </InlineImage>
                  ) : null}
                  <div className="flex flex-col">
                    <span className="font-medium">
                      <InlineText
                        editor={editor}
                        target={{
                          kind: "item",
                          id: testimonial.id,
                          key: "title",
                        }}
                        value={testimonial.title}
                        label="autor do depoimento"
                      />
                    </span>
                    {testimonial.value ? (
                      <span className="text-sm text-muted-foreground">
                        <InlineText
                          editor={editor}
                          target={{
                            kind: "item",
                            id: testimonial.id,
                            key: "value",
                          }}
                          value={testimonial.value}
                          label="cargo do autor"
                        />
                      </span>
                    ) : null}
                    {testimonial.features[1] ? (
                      <span className="text-sm text-muted-foreground">
                        {testimonial.features[1]}
                      </span>
                    ) : null}
                  </div>
                </figcaption>
              </figure>
            ) : null}

            <ul className="flex flex-wrap justify-start gap-6">
              {ratings.map((rating) => (
                <li key={rating.id} className="flex items-center gap-3">
                  {safeImageUrl(rating.href) ? (
                    <InlineImage
                      editor={editor}
                      target={{ kind: "item", id: rating.id, key: "href" }}
                      url={rating.href}
                      alt={rating.title}
                      className="!rounded-none"
                    >
                      <img
                        src={safeImageUrl(rating.href)}
                        alt=""
                        loading="lazy"
                        className="size-8"
                      />
                    </InlineImage>
                  ) : null}
                  <p className="flex flex-col">
                    <span className="font-semibold">
                      <InlineText
                        editor={editor}
                        target={{ kind: "item", id: rating.id, key: "value" }}
                        value={rating.value}
                        label="nota da avaliação"
                      />
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <InlineText
                        editor={editor}
                        target={{ kind: "item", id: rating.id, key: "title" }}
                        value={rating.title}
                        label="origem da avaliação"
                      />
                      {" · "}
                      <InlineText
                        editor={editor}
                        target={{
                          kind: "item",
                          id: rating.id,
                          key: "description",
                        }}
                        value={rating.description}
                        label="detalhes da avaliação"
                      />
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
