import { useState } from "react"
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

export function GalleryCarouselBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const items = p.items ?? []

  return (
    <section className="builder-block builder-block--spacious">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-8 flex flex-col justify-between md:mb-14 md:flex-row md:items-end lg:mb-16">
          <div>
            <h2 className="mb-3 text-3xl font-semibold md:mb-4 md:text-4xl lg:mb-6">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título da galeria"
              />
            </h2>
            <a
              href={safeHref(p.href)}
              className="group flex items-center gap-1 text-sm font-medium md:text-base lg:text-lg"
            >
              <InlineText
                editor={editor}
                focusable={false}
                target={{ kind: "property", key: "button" }}
                value={p.button}
                label="texto do link de demonstração"
              />
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
          <div className="mt-8 flex shrink-0 items-center justify-start gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="pointer-events-auto"
              data-inline-editor-control=""
              aria-label="Item anterior da galeria"
              onClick={() => carouselApi?.scrollPrev()}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="pointer-events-auto"
              data-inline-editor-control=""
              aria-label="Próximo item da galeria"
              onClick={() => carouselApi?.scrollNext()}
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1400px] min-w-0">
        <Carousel
          setApi={setCarouselApi}
          opts={{
            loop: true,
            align: "start",
            breakpoints: {
              "(max-width: 768px)": {
                dragFree: true,
              },
            },
          }}
          className="w-full min-w-0"
        >
          <CarouselContent className="-ml-8">
            {items.map((item) => {
              const imageUrl = safeImageUrl(item.value)
              const itemTarget = (
                key: "title" | "description" | "href" | "value"
              ) => ({
                kind: "item" as const,
                id: item.id,
                key,
              })

              return (
                <CarouselItem
                  key={item.id}
                  className="pl-8 md:basis-1/2 xl:basis-1/3"
                >
                  <a
                    href={safeHref(item.href)}
                    className="group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex aspect-3/2 overflow-clip rounded-xl">
                        <div className="flex-1">
                          <div className="relative h-full w-full origin-bottom transition duration-300 group-hover:scale-105">
                            {imageUrl ? (
                              <InlineImage
                                editor={editor}
                                target={{
                                  kind: "item",
                                  id: item.id,
                                  key: "value",
                                }}
                                url={item.value}
                                alt={item.title}
                                className="size-full !rounded-none"
                              >
                                <img
                                  src={imageUrl}
                                  alt={item.title}
                                  width={904}
                                  height={603}
                                  loading="lazy"
                                  className="h-full w-full object-cover object-center"
                                />
                              </InlineImage>
                            ) : (
                              <div
                                className="h-full w-full bg-muted"
                                role="img"
                                aria-label={`Imagem indisponível: ${item.title}`}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mb-2 line-clamp-3 pt-4 text-lg font-medium break-words md:mb-3 md:pt-4 md:text-xl lg:pt-4 lg:text-2xl">
                      <InlineText
                        editor={editor}
                        focusable={false}
                        target={itemTarget("title")}
                        value={item.title}
                        label="título do item da galeria"
                      />
                    </div>
                    <div className="mb-8 line-clamp-2 text-sm text-muted-foreground md:mb-12 md:text-base lg:mb-9">
                      <InlineText
                        editor={editor}
                        focusable={false}
                        target={itemTarget("description")}
                        value={item.description}
                        label="resumo do item da galeria"
                      />
                    </div>
                    <div className="flex items-center text-sm">
                      Leia mais{" "}
                      <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </a>
                </CarouselItem>
              )
            })}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  )
}
