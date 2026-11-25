import { Separator } from "@/components/ui/separator"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"

const MAX_CASE_STUDIES = 2

function CaseStudyImage({
  item,
  editor,
}: {
  item: ContentItem
  editor?: InlineEditor
}) {
  const imageUrl = safeImageUrl(item.href)

  if (!imageUrl) {
    return (
      <div
        className="aspect-29/35 w-full max-w-60 shrink-0 rounded-2xl bg-muted sm:h-full"
        aria-hidden="true"
      />
    )
  }

  return (
    <InlineImage
      editor={editor}
      target={{ kind: "item", id: item.id, key: "href" }}
      altTarget={{ kind: "item-feature", id: item.id, index: 8 }}
      url={item.href}
      alt={item.features[8] || item.title}
      className="aspect-29/35 w-full max-w-60 shrink-0 sm:h-full"
    >
      <img
        src={imageUrl}
        alt={item.features[8] || item.title}
        loading="lazy"
        className="size-full rounded-2xl object-cover"
      />
    </InlineImage>
  )
}

function CompanyLogo({
  item,
  editor,
}: {
  item: ContentItem
  editor?: InlineEditor
}) {
  const logoUrl = safeImageUrl(item.features[0] ?? "")

  if (!logoUrl) return null

  return (
    <InlineImage
      editor={editor}
      target={{ kind: "item-feature", id: item.id, index: 0 }}
      altTarget={{ kind: "item-feature", id: item.id, index: 1 }}
      url={item.features[0] ?? ""}
      alt={item.features[1] ?? ""}
      className="ml-auto max-w-28 shrink-0 !rounded-none"
    >
      <img
        src={logoUrl}
        alt={item.features[1] ?? ""}
        loading="lazy"
        className="max-h-8 max-w-28 object-contain"
      />
    </InlineImage>
  )
}

function Metric({
  item,
  editor,
  index,
}: {
  item: ContentItem
  editor?: InlineEditor
  index: 2 | 5
}) {
  const labelIndex = index + 1
  const detailIndex = index + 2

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-4xl font-medium text-foreground sm:text-5xl">
        <InlineText
          editor={editor}
          target={{ kind: "item-feature", id: item.id, index }}
          value={item.features[index] ?? ""}
          label="valor do indicador"
        />
      </p>
      <p className="font-semibold text-foreground">
        <InlineText
          editor={editor}
          target={{ kind: "item-feature", id: item.id, index: labelIndex }}
          value={item.features[labelIndex] ?? ""}
          label="nome do indicador"
        />
      </p>
      <p className="text-sm text-muted-foreground">
        <InlineText
          editor={editor}
          target={{ kind: "item-feature", id: item.id, index: detailIndex }}
          value={item.features[detailIndex] ?? ""}
          label="detalhe do indicador"
        />
      </p>
    </div>
  )
}

export function CaseStudiesBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const caseStudies = (p.items ?? []).slice(0, MAX_CASE_STUDIES)

  return (
    <section className="builder-block bg-background">
      <div className="container mx-auto">
        <header className="flex flex-col gap-6 text-center">
          <p className="font-medium">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "eyebrow" }}
              value={p.eyebrow}
              label="texto acima do título"
            />
          </p>
          <h2 className="text-4xl font-medium md:text-5xl">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "title" }}
              value={p.title}
              label="título"
            />
          </h2>
        </header>

        <div className="mt-16">
          {caseStudies.map((item, index) => (
            <article key={item.id}>
              {index > 0 ? <Separator className="my-16 md:my-20" /> : null}
              <div className="grid gap-10 @4xl:grid-cols-3 @4xl:gap-16 @5xl:gap-24">
                <div className="flex min-w-0 flex-col gap-8 border-border sm:flex-row @4xl:col-span-2 @4xl:gap-10 @4xl:border-r @4xl:pr-16 @5xl:pr-24">
                  <CaseStudyImage item={item} editor={editor} />
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-8">
                    <blockquote className="sm:text-xl">
                      <InlineText
                        editor={editor}
                        target={{ kind: "item", id: item.id, key: "description" }}
                        value={item.description}
                        label="depoimento"
                        multiline
                      />
                    </blockquote>
                    <div className="flex items-end gap-6">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-lg font-semibold text-foreground">
                          <InlineText
                            editor={editor}
                            target={{ kind: "item", id: item.id, key: "title" }}
                            value={item.title}
                            label="nome da pessoa"
                          />
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <InlineText
                            editor={editor}
                            target={{ kind: "item", id: item.id, key: "value" }}
                            value={item.value}
                            label="cargo"
                          />
                        </p>
                      </div>
                      <CompanyLogo item={item} editor={editor} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 @4xl:flex @4xl:flex-col @4xl:justify-center @4xl:gap-10">
                  <Metric item={item} editor={editor} index={2} />
                  <Metric item={item} editor={editor} index={5} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
