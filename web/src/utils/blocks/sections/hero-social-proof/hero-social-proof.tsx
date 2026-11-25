import { Star } from "lucide-react"
import { useId } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"

const MAX_REVIEWERS = 5
const STAR_COUNT = 5

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase()
}

function itemType(item: ContentItem) {
  return item.features[0]
}

export function HeroSocialProofBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const items = p.items ?? []
  const secondary = items.find((item) => itemType(item) === "secondary-button")
  const reviews = items.find((item) => itemType(item) === "reviews")
  const reviewers = items
    .filter((item) => itemType(item) === "avatar")
    .slice(0, MAX_REVIEWERS)
  const rating = Number.parseFloat(reviews?.value ?? "")
  const count = Number.parseInt(reviews?.features[1] ?? "", 10)

  return (
    <section
      id={sectionId}
      className="builder-block builder-block--spacious bg-background"
    >
      <div className="container mx-auto text-center">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <h1 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-pretty @md:text-6xl">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "title" }}
              value={p.title}
              label="título principal"
            />
          </h1>
          <p className="mx-auto max-w-4xl text-balance text-muted-foreground @md:text-lg">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "description" }}
              value={p.description}
              label="descrição"
              multiline
            />
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 @md:flex-row">
          {p.button ? (
            <Button
              size="lg"
              className="pointer-events-auto h-12 w-full px-8 text-base @md:w-auto"
              data-inline-editor-control=""
              nativeButton={false}
              role="link"
              render={<a href={safeHref(p.href)} />}
            >
              {p.button}
            </Button>
          ) : null}
          {secondary ? (
            <Button
              size="lg"
              variant="outline"
              className="pointer-events-auto h-12 w-full px-8 text-base @md:w-auto"
              data-inline-editor-control=""
              nativeButton={false}
              role="link"
              render={<a href={safeHref(secondary.href)} />}
            >
              <InlineText
                editor={editor}
                focusable={false}
                target={{ kind: "item", id: secondary.id, key: "title" }}
                value={secondary.title}
                label="texto do botão secundário"
              />
            </Button>
          ) : null}
        </div>

        {reviews ? (
          <div className="mx-auto mt-10 flex w-fit flex-col items-center gap-3 @md:flex-row @md:gap-2">
            <span
              className="inline-flex items-center -space-x-3"
              aria-label={`${reviewers.length} pessoas avaliaram o produto`}
            >
              {reviewers.map((reviewer) => (
                <InlineImage
                  key={reviewer.id}
                  editor={editor}
                  target={{ kind: "item", id: reviewer.id, key: "href" }}
                  altTarget={{
                    kind: "item-feature",
                    id: reviewer.id,
                    index: 1,
                  }}
                  url={reviewer.href}
                  alt={reviewer.features[1] || reviewer.title}
                  className="!rounded-full"
                >
                  <Avatar className="size-12 border-2 border-background">
                    <AvatarImage
                      src={safeImageUrl(reviewer.href)}
                      alt={reviewer.features[1] || reviewer.title}
                    />
                    <AvatarFallback>{initials(reviewer.title)}</AvatarFallback>
                  </Avatar>
                </InlineImage>
              ))}
            </span>
            <div>
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: STAR_COUNT }, (_, index) => (
                  <Star
                    key={index}
                    className="size-5 fill-yellow-400 text-yellow-400"
                    aria-hidden="true"
                  />
                ))}
                {Number.isFinite(rating) ? (
                  <span className="mr-1 font-semibold">
                    {rating.toFixed(1)}
                  </span>
                ) : null}
              </div>
              {Number.isFinite(count) ? (
                <p className="text-left font-medium text-muted-foreground">
                  from {count}+ reviews
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
