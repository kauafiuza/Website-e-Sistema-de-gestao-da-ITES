import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import {
  InlineImage,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"

const MAX_LOGOS = 6

export function LogosStaticRowBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const logos = (p.items ?? []).slice(0, MAX_LOGOS)

  return (
    <section className="builder-block bg-background">
      <div className="container mx-auto">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 @4xl:gap-x-12">
          {logos.map((logo) => (
            <li
              key={logo.id}
              className="flex aspect-[3/1] w-28 items-center justify-center sm:w-32"
            >
              <LogoLink logo={logo} editor={editor} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function LogoLink({
  logo,
  editor,
}: {
  logo: ContentItem
  editor?: InlineEditor
}) {
  const imageUrl = safeImageUrl(logo.value)
  const darkImageUrl = safeImageUrl(logo.features[0] ?? "")
  const imageClass =
    logo.features[1] === "small"
      ? "h-auto max-h-5 w-auto object-contain"
      : "h-auto max-h-7 w-auto object-contain"

  return (
    <a
      href={safeHref(logo.href)}
      target="_blank"
      rel="noopener noreferrer"
      className="pointer-events-auto flex max-w-full items-center justify-center opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
      data-inline-editor-control=""
      aria-label={logo.title}
    >
      {imageUrl ? (
        darkImageUrl ? (
          <>
            <InlineImage
              editor={editor}
              target={{ kind: "item", id: logo.id, key: "value" }}
              altTarget={{ kind: "item", id: logo.id, key: "title" }}
              url={logo.value}
              alt={logo.title}
              className="!rounded-none"
            >
              <img
                src={imageUrl}
                alt={logo.title}
                loading="lazy"
                className={`${imageClass} dark:hidden`}
              />
            </InlineImage>
            <InlineImage
              editor={editor}
              target={{ kind: "item-feature", id: logo.id, index: 0 }}
              altTarget={{ kind: "item", id: logo.id, key: "title" }}
              url={logo.features[0] ?? ""}
              alt={logo.title}
              className="hidden !rounded-none dark:block"
            >
              <img
                src={darkImageUrl}
                alt={logo.title}
                loading="lazy"
                className={imageClass}
              />
            </InlineImage>
          </>
        ) : (
          <InlineImage
            editor={editor}
            target={{ kind: "item", id: logo.id, key: "value" }}
            altTarget={{ kind: "item", id: logo.id, key: "title" }}
            url={logo.value}
            alt={logo.title}
            className="!rounded-none"
          >
            <img
              src={imageUrl}
              alt={logo.title}
              loading="lazy"
              className={`${imageClass} dark:invert`}
            />
          </InlineImage>
        )
      ) : null}
    </a>
  )
}
