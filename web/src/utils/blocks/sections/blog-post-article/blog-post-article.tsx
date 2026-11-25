import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
}

function ArticleSegment({
  item,
  editor,
}: {
  item: ContentItem
  editor?: InlineEditor
}) {
  const target = (key: "title" | "description") => ({
    kind: "item" as const,
    id: item.id,
    key,
  })

  switch (item.value) {
    case "h2":
      return (
        <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight @md:text-3xl">
          <InlineText
            editor={editor}
            target={target("title")}
            value={item.title}
            label="título da seção"
            as="h2"
          />
        </h2>
      )
    case "h3":
      return (
        <h3 className="text-xl font-semibold tracking-tight">
          <InlineText
            editor={editor}
            target={target("title")}
            value={item.title}
            label="subtítulo"
            as="h3"
          />
        </h3>
      )
    case "paragraph":
      return (
        <InlineText
          editor={editor}
          target={target("description")}
          value={item.description}
          label="parágrafo"
          as="p"
          multiline
          className="leading-7 text-pretty"
        />
      )
    case "list-item":
    case "ordered-item":
      return item.features[0] === "nested" ? (
        <li className="ml-5 list-[circle] leading-7">
          <InlineText
            editor={editor}
            target={target("description")}
            value={item.description}
            label="item da lista"
          />
        </li>
      ) : (
        <li className="leading-7">
          <InlineText
            editor={editor}
            target={target("description")}
            value={item.description}
            label="item da lista"
          />
        </li>
      )
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-primary pl-6 text-lg font-medium text-foreground/85 italic">
          <InlineText
            editor={editor}
            target={target("description")}
            value={item.description}
            label="citação"
            as="p"
            multiline
          />
        </blockquote>
      )
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm leading-6">
          <code>
            <InlineText
              editor={editor}
              target={target("description")}
              value={item.description}
              label="bloco de código"
              multiline
            />
          </code>
        </pre>
      )
    case "figure": {
      const imageUrl = safeImageUrl(item.href)
      return (
        <figure className="flex flex-col gap-3">
          {imageUrl ? (
            <InlineImage
              editor={editor}
              target={{ kind: "item", id: item.id, key: "href" }}
              url={item.href}
              alt={item.title}
            >
              <img
                src={imageUrl}
                alt={item.title}
                className="aspect-video w-full rounded-lg border object-cover"
                loading="lazy"
              />
            </InlineImage>
          ) : null}
          <figcaption className="text-sm text-muted-foreground">
            <InlineText
              editor={editor}
              target={target("description")}
              value={item.description}
              label="legenda da imagem"
              as="p"
              multiline
            />
          </figcaption>
        </figure>
      )
    }
    case "footnote":
      return (
        <InlineText
          editor={editor}
          target={target("description")}
          value={item.description}
          label="nota de rodapé"
          as="p"
          multiline
          className="border-t pt-4 text-sm text-muted-foreground"
        />
      )
    default:
      return null
  }
}

export function BlogPostArticleBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const items = p.items ?? []
  const author = items.find((item) => item.value === "author")
  const content = items.filter((item) => item.value !== "author")
  const authorName = author?.title ?? ""
  const authorAvatar = safeImageUrl(author?.href ?? "")
  const authorWebsite = safeHref(author?.features[4] ?? "#")
  const cover = safeImageUrl(p.imageUrl ?? "")

  return (
    <article className="builder-block builder-block--spacious bg-background">
      <header className="container mx-auto">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-pretty @md:text-5xl @4xl:text-6xl">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "title" }}
              value={p.title}
              label="título do artigo"
            />
          </h1>
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "description" }}
            value={p.description}
            label="resumo do artigo"
            as="p"
            multiline
            className="max-w-3xl text-lg text-muted-foreground @md:text-xl"
          />
          {author ? (
            <div className="flex flex-col items-center gap-2 text-sm @md:flex-row @md:gap-3">
              <div className="flex items-center gap-2">
                <InlineImage
                  editor={editor}
                  target={{ kind: "item", id: author.id, key: "href" }}
                  url={author.href}
                  alt={authorName}
                  className="!rounded-full"
                >
                  <Avatar className="size-8 border">
                    {authorAvatar ? (
                      <AvatarImage src={authorAvatar} alt={authorName} />
                    ) : null}
                    <AvatarFallback>{initials(authorName)}</AvatarFallback>
                  </Avatar>
                </InlineImage>
                <span className="font-semibold">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: author.id, key: "title" }}
                    value={authorName}
                    label="autor"
                  />
                </span>
              </div>
              {author.features[1] ? (
                <span className="text-muted-foreground">
                  {author.features[1]}
                </span>
              ) : null}
              {author.features[4] && author.features[5] ? (
                <a
                  href={authorWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {author.features[5]}
                </a>
              ) : null}
              <time className="text-muted-foreground">
                {p.button ? `${p.button} ` : null}
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "eyebrow" }}
                  value={p.eyebrow}
                  label="data de publicação"
                />
              </time>
            </div>
          ) : null}
          {cover ? (
            <InlineImage
              editor={editor}
              url={p.imageUrl ?? ""}
              alt={p.imageAlt ?? ""}
              className="mt-4 w-full"
            >
              <img
                src={cover}
                alt={p.imageAlt ?? ""}
                className="aspect-video w-full rounded-lg border object-cover"
              />
            </InlineImage>
          ) : null}
        </div>
      </header>

      <div className="container mx-auto mt-8 @md:mt-12">
        <div className="prose dark:prose-invert mx-auto flex max-w-3xl flex-col gap-5 text-foreground @md:gap-7">
          {content.map((item, index) => {
            if (item.value === "table-header") {
              const rows: ContentItem[] = []
              for (
                let next = index + 1;
                next < content.length && content[next].value === "table-row";
                next += 1
              )
                rows.push(content[next])
              return (
                <div
                  key={item.id}
                  className="pointer-events-auto overflow-x-auto"
                  data-inline-editor-control=""
                >
                  <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        {item.features.map((cell, cellIndex) => (
                          <th
                            key={`${item.id}-${cellIndex}`}
                            scope="col"
                            className="px-3 py-2 font-semibold"
                          >
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-b">
                          {row.features.map((cell, cellIndex) => (
                            <td
                              key={`${row.id}-${cellIndex}`}
                              className="px-3 py-2"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
            if (item.value === "table-row") return null
            if (item.value === "list-item") {
              if (item.features[0] === "nested") return null
              if (content[index - 1]?.value === "list-item") return null
              const listItems: ContentItem[] = []
              for (
                let next = index;
                next < content.length && content[next].value === "list-item";
                next += 1
              )
                listItems.push(content[next])
              const topItems = listItems.filter(
                (entry) => entry.features[0] !== "nested"
              )
              return (
                <ul key={item.id} className="list-disc space-y-1 pl-6">
                  {topItems.map((entry) => {
                    const nestedItems = listItems.filter(
                      (candidate, candidateIndex) =>
                        candidate.features[0] === "nested" &&
                        listItems.indexOf(entry) < candidateIndex &&
                        !topItems.some(
                          (nextTop) =>
                            listItems.indexOf(nextTop) > candidateIndex
                        )
                    )
                    return (
                      <li key={entry.id} className="leading-7">
                        <InlineText
                          editor={editor}
                          target={{
                            kind: "item",
                            id: entry.id,
                            key: "description",
                          }}
                          value={entry.description}
                          label="item da lista"
                        />
                        {nestedItems.length ? (
                          <ul className="list-[circle] space-y-1 pl-6">
                            {nestedItems.map((nested) => (
                              <ArticleSegment
                                key={nested.id}
                                item={nested}
                                editor={editor}
                              />
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )
            }
            if (item.value === "ordered-item") {
              const prior = content[index - 1]
              if (prior?.value === "ordered-item") return null
              const listItems: ContentItem[] = []
              for (
                let next = index;
                next < content.length && content[next].value === "ordered-item";
                next += 1
              )
                listItems.push(content[next])
              return (
                <ol key={item.id} className="list-decimal space-y-1 pl-6">
                  {listItems.map((entry) => (
                    <ArticleSegment
                      key={entry.id}
                      item={entry}
                      editor={editor}
                    />
                  ))}
                </ol>
              )
            }
            return <ArticleSegment key={item.id} item={item} editor={editor} />
          })}
        </div>
      </div>
    </article>
  )
}
