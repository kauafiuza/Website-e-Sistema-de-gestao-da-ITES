import { ArrowRight, Wifi } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { BlockProps } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"

export function HeroProductBasicBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const imageUrl = safeImageUrl(p.imageUrl ?? "")
  const image = imageUrl ? (
    <img
      src={imageUrl}
      alt={p.imageAlt ?? ""}
      width={1280}
      height={720}
      loading="lazy"
      className="mx-auto aspect-[3/4] h-full max-h-[524px] w-full max-w-5xl rounded-lg border border-border object-cover object-top @md:aspect-video"
    />
  ) : null

  return (
    <section className="builder-block builder-block--spacious overflow-hidden bg-background">
      <div className="container mx-auto">
        <div className="flex flex-col gap-5">
          <div className="relative isolate flex flex-col gap-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 -z-10 mx-auto size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border mask-[linear-gradient(to_top,transparent,transparent,white,white,white,transparent,transparent)] p-16 [-webkit-mask-image:linear-gradient(to_top,transparent,transparent,white,white,white,transparent,transparent)] @md:size-[1300px] @md:p-32"
            >
              <div className="size-full rounded-full border border-border p-16 @md:p-32">
                <div className="size-full rounded-full border border-border" />
              </div>
            </div>
            <span className="mx-auto flex size-16 items-center justify-center rounded-full border @md:size-20">
              <Wifi className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mx-auto max-w-xl text-center text-4xl font-semibold tracking-tight text-pretty @md:text-5xl @4xl:max-w-3xl @4xl:text-6xl">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título principal"
              />
            </h1>
            <p className="mx-auto max-w-5xl text-center text-lg text-balance text-muted-foreground @md:text-xl">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "description" }}
                value={p.description}
                label="descrição"
                multiline
              />
            </p>
            <div className="flex flex-col items-center gap-3 pt-3 pb-8">
              {p.button ? (
                <Button
                  size="lg"
                  className="pointer-events-auto h-12 w-full sm:w-auto"
                  data-inline-editor-control=""
                  nativeButton={false}
                  role="link"
                  render={<a href={safeHref(p.href)} />}
                >
                  {p.button}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
              {p.eyebrow ? (
                <div className="text-center text-sm text-muted-foreground">
                  <InlineText
                    editor={editor}
                    target={{ kind: "property", key: "eyebrow" }}
                    value={p.eyebrow}
                    label="texto de confiança"
                  />
                </div>
              ) : null}
            </div>
          </div>
          <InlineImage editor={editor} url={imageUrl} alt={p.imageAlt ?? ""}>
            {image}
          </InlineImage>
        </div>
      </div>
    </section>
  )
}
