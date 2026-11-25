import { Button } from "@/components/ui/button"
import { useId } from "react"

import type { BlockProps } from "@/utils/blocks/types"
import { safeImageUrl } from "@/utils/blocks/shared/urls"
import { safeHref } from "@/utils/blocks/shared/urls"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"

const DEFAULT_HERO_IMAGE =
  "https://cdn.shadcnblocks.com/shadcnblocks/image-set/modern/company-benefits/photo-1-3x4.jpg"
const DEFAULT_HERO_ALT =
  "Duas pessoas conversando diante de um laptop em uma sala envidraçada"

export function HeroSplitBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const imageUrl = safeImageUrl(p.imageUrl || DEFAULT_HERO_IMAGE)
  const imageAlt = p.imageAlt || DEFAULT_HERO_ALT
  const link = (
    <Button
      nativeButton={false}
      role="link"
      render={<a href={safeHref(p.href)} />}
    >
      <InlineText
        editor={editor}
        focusable={false}
        target={{ kind: "property", key: "button" }}
        value={p.button}
        label="texto do botão"
      />{" "}
      <span aria-hidden="true">↗</span>
    </Button>
  )
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
      <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
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
  const artContent = imageUrl ? (
    <img
      src={imageUrl}
      alt={imageAlt}
      width={800}
      height={480}
      loading="lazy"
      className="aspect-[5/3] w-full rounded-xl object-cover"
    />
  ) : (
    <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-secondary">
      <div className="h-36 w-36 rotate-[-20deg] rounded-xl bg-primary" />
      <div className="absolute h-24 w-24 translate-x-20 translate-y-14 rounded-full border-[18px] border-white/70" />
    </div>
  )
  const art = (
    <InlineImage editor={editor} url={imageUrl} alt={imageAlt}>
      {artContent}
    </InlineImage>
  )
  return (
    <section
      id={sectionId}
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${(p.alignment ?? "left") === "left" ? "text-left" : "text-center"}`}
    >
      {
        <div className={"grid items-center gap-10 @md:grid-cols-2"}>
          <div>
            {heading}
            <div className="my-7">{link}</div>
            <p className="mb-8 text-xs text-muted-foreground">
              No credit card required · Made for your next idea
            </p>
          </div>
          {art}
        </div>
      }
    </section>
  )
}
