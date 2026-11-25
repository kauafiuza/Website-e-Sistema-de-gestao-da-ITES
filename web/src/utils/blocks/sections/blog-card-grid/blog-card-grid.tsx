import { ArrowRight } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

const MAX_POSTS = 6

export function BlogCardGridBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const visiblePosts = (p.items ?? []).slice(0, MAX_POSTS)

  return (
    <section className="builder-block builder-block--spacious bg-background">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="flex flex-col items-center gap-12">
          <header className="flex flex-col items-center gap-4 text-center">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance @md:text-4xl">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título do blog"
              />
            </h2>
            <p className="max-w-2xl text-lg font-medium text-pretty text-muted-foreground @md:text-xl">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "description" }}
                value={p.description}
                label="descrição do blog"
                multiline
              />
            </p>
          </header>
          <div className="grid w-full gap-6 @md:grid-cols-2 @4xl:grid-cols-3">
            {visiblePosts.map((post) => {
              const [imageAlt, , date, , author, , , cta] = post.features
              const href = safeHref(post.href)
              const imageUrl = safeImageUrl(post.value)

              return (
                <Card
                  key={post.id}
                  className="grid grid-rows-[auto_auto_1fr_auto] overflow-hidden pt-0"
                >
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="block aspect-video w-full overflow-hidden bg-muted"
                  >
                    {imageUrl ? (
                      <InlineImage
                        editor={editor}
                        target={{ kind: "item", id: post.id, key: "value" }}
                        altTarget={{
                          kind: "item-feature",
                          id: post.id,
                          index: 0,
                        }}
                        url={post.value}
                        alt={imageAlt ?? post.title}
                        className="size-full !rounded-none"
                      >
                        <img
                          src={imageUrl}
                          alt={imageAlt ?? post.title}
                          width={640}
                          height={360}
                          loading="lazy"
                          className="h-full w-full object-cover object-center transition-opacity duration-300 hover:opacity-90"
                        />
                      </InlineImage>
                    ) : null}
                  </a>
                  <CardHeader className="gap-3">
                    <h3 className="text-lg leading-snug font-semibold text-balance">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        <InlineText
                          editor={editor}
                          focusable={false}
                          target={{ kind: "item", id: post.id, key: "title" }}
                          value={post.title}
                          label="título do artigo"
                        />
                      </a>
                    </h3>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium text-foreground">
                        {author}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground/40"
                      >
                        ·
                      </span>
                      <time className="text-muted-foreground tabular-nums">
                        {date}
                      </time>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm leading-relaxed text-pretty text-muted-foreground">
                      <InlineText
                        editor={editor}
                        focusable={false}
                        target={{
                          kind: "item",
                          id: post.id,
                          key: "description",
                        }}
                        value={post.description}
                        label="resumo do artigo"
                      />
                    </p>
                  </CardContent>
                  <CardFooter>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/cue inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {cta}
                      <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover/cue:text-foreground" />
                    </a>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
