import { ArrowRight } from "lucide-react"
import { useId } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { BlockProps } from "@/utils/blocks/types"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"

const MAX_POSTS = 3

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase()
}

export function BlogClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()
  const posts = (p.items ?? []).slice(0, MAX_POSTS)

  return (
    <section
      id={sectionId}
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${(p.alignment ?? "center") === "left" ? "text-left" : "text-center"}`}
    >
      <header className="mx-auto mb-9 max-w-3xl">
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
      </header>

      <div className="grid gap-6 text-left @md:grid-cols-2 @4xl:grid-cols-3">
        {posts.map((post) => {
          const [
            imageAlt,
            category,
            date,
            readTime,
            author,
            avatarUrl,
            avatarAlt,
            cta,
          ] = post.features
          const imageUrl = safeImageUrl(post.value)
          const href = safeHref(post.href)

          return (
            <Card
              key={post.id}
              className="grid min-w-0 grid-rows-[auto_auto_1fr_auto] overflow-hidden pt-0"
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
                    altTarget={{ kind: "item-feature", id: post.id, index: 0 }}
                    url={post.value}
                    alt={imageAlt || post.title}
                    className="size-full !rounded-none"
                  >
                    <img
                      src={imageUrl}
                      alt={imageAlt || post.title}
                      width={640}
                      height={360}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                  </InlineImage>
                ) : null}
              </a>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {category ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                      {category}
                    </span>
                  ) : null}
                  {readTime ? <span>{readTime} read</span> : null}
                </div>
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
                {date ? (
                  <time className="text-sm text-muted-foreground tabular-nums">
                    {date}
                  </time>
                ) : null}
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm leading-relaxed text-pretty text-muted-foreground">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: post.id, key: "description" }}
                    value={post.description}
                    label="resumo do artigo"
                    multiline
                  />
                </p>
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <InlineImage
                    editor={editor}
                    target={{ kind: "item-feature", id: post.id, index: 5 }}
                    altTarget={{ kind: "item-feature", id: post.id, index: 6 }}
                    url={avatarUrl ?? ""}
                    alt={avatarAlt ?? author ?? ""}
                    className="!rounded-full"
                  >
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage
                        src={safeImageUrl(avatarUrl ?? "")}
                        alt={avatarAlt ?? author ?? ""}
                      />
                      <AvatarFallback className="text-[10px]">
                        {initials(author ?? "")}
                      </AvatarFallback>
                    </Avatar>
                  </InlineImage>
                  <span className="truncate">{author}</span>
                </span>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/cue inline-flex shrink-0 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                >
                  {cta || "Ler artigo"}
                  <ArrowRight
                    className="size-4 text-muted-foreground transition-transform group-hover/cue:translate-x-1"
                    aria-hidden="true"
                  />
                </a>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
