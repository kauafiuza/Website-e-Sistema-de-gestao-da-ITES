import { ExternalLink } from "lucide-react"

import type { BlockProps } from "@/utils/blocks/types"
import {
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"

export function AwardsTableBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const awards = p.items ?? []

  return (
    <section className="builder-block builder-block--spacious bg-background">
      <div className="container mx-auto flex flex-col gap-10 @4xl:gap-12">
        <h1 className="max-w-md text-5xl font-semibold tracking-tighter @4xl:text-7xl">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "title" }}
            value={p.title}
            label="título"
          />
        </h1>
        <div
          className="pointer-events-auto overflow-x-auto"
          data-inline-editor-control=""
        >
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">{p.title}</caption>
            <thead>
              <tr className="h-12 border-b text-sm text-foreground/80">
                <th scope="col" className="pr-6 font-semibold">
                  Award
                </th>
                <th scope="col" className="px-6 font-semibold">
                  Description
                </th>
                <th scope="col" className="pl-6 text-right font-semibold">
                  Year
                </th>
              </tr>
            </thead>
            <tbody>
              {awards.map((award) => (
                <tr
                  key={award.id}
                  className="border-b text-sm text-foreground/60 transition-colors hover:bg-muted/40"
                >
                  <td className="py-5 pr-6 text-lg font-medium tracking-tight text-foreground @md:text-xl">
                    <a
                      href={safeHref(award.href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:underline"
                    >
                      <InlineText
                        editor={editor}
                        focusable={false}
                        target={{ kind: "item", id: award.id, key: "title" }}
                        value={award.title}
                        label="nome do prêmio"
                      />
                      <ExternalLink
                        className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                        aria-hidden="true"
                      />
                    </a>
                  </td>
                  <td className="px-6 py-5">
                    <InlineText
                      editor={editor}
                      target={{
                        kind: "item",
                        id: award.id,
                        key: "description",
                      }}
                      value={award.description}
                      label="descrição do prêmio"
                      multiline
                    />
                  </td>
                  <td className="py-5 pl-6 text-right text-foreground tabular-nums">
                    <InlineText
                      editor={editor}
                      target={{ kind: "item", id: award.id, key: "value" }}
                      value={award.value}
                      label="ano do prêmio"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
