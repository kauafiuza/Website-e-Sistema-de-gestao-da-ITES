"use client"

import { ArrowUpRight, Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeHref } from "@/utils/blocks/shared/urls"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

export function CodeExample1Block({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const snippets = p.items ?? []
  const [activeId, setActiveId] = useState(snippets[0]?.id ?? "")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const activeSnippet = snippets.find((snippet) => snippet.id === activeId) ?? snippets[0]

  const copyCode = async (snippet: ContentItem) => {
    try {
      await navigator.clipboard.writeText(snippet.features[0] ?? "")
      setCopiedId(snippet.id)
      window.setTimeout(() => setCopiedId(null), 1800)
    } catch {
      setCopiedId(null)
    }
  }

  return (
    <section className="builder-block builder-block--spacious w-full bg-background">
      <div className="container mx-auto">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-0">
          <div className="flex flex-col gap-6 lg:pr-20">
            <InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo" className="text-lg text-muted-foreground" />
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              <InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" as="strong" className="font-bold" />
              <br />
              <InlineText editor={editor} target={{ kind: "property", key: "highlight" }} value={p.highlight ?? ""} label="destaque do título" className="text-muted-foreground" />
            </h2>
            <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" as="p" className="text-muted-foreground md:text-lg" />
            <Button
              size="lg"
              className="w-fit"
              render={<a href={safeHref(p.href)} />}
              nativeButton={false}
            >
              <InlineText editor={editor} target={{ kind: "property", key: "button" }} value={p.button} label="texto do botão" focusable={false} />
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2 overflow-hidden">
            {snippets.length ? (
              <Tabs
                value={activeSnippet?.id ?? ""}
                onValueChange={(value) => {
                  setActiveId(value)
                  setCopiedId(null)
                }}
                className="pointer-events-auto w-full"
              >
                <TabsList className="h-10 w-full justify-start overflow-x-auto">
                  {snippets.map((snippet) => (
                    <TabsTrigger
                      key={snippet.id}
                      value={snippet.id}
                      className="pointer-events-auto shrink-0"
                      data-inline-editor-control=""
                    >
                      {snippet.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {snippets.map((snippet) => (
                  <TabsContent key={snippet.id} value={snippet.id} className="mt-2">
                    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground">
                      <div className="flex h-11 items-center justify-between gap-3 border-b px-4">
                        <InlineText
                          editor={editor}
                          target={{ kind: "item", id: snippet.id, key: "description" }}
                          value={snippet.description}
                          label="nome do arquivo"
                          className="truncate font-mono text-xs text-muted-foreground"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={copiedId === snippet.id ? "Código copiado" : "Copiar código"}
                          title={copiedId === snippet.id ? "Copiado" : "Copiar código"}
                          className="pointer-events-auto shrink-0"
                          data-inline-editor-control=""
                          onClick={() => void copyCode(snippet)}
                        >
                          {copiedId === snippet.id ? <Check /> : <Copy />}
                        </Button>
                      </div>
                      <ScrollArea className="pointer-events-auto h-96 w-full">
                        <pre className="min-h-96 min-w-max p-4 text-sm leading-6 text-foreground">
                          <InlineText
                            editor={editor}
                            target={{ kind: "item-feature", id: snippet.id, index: 0 }}
                            value={snippet.features[0] ?? ""}
                            label={`código de ${snippet.title}`}
                            as="strong"
                            multiline
                            className="block whitespace-pre font-mono font-normal"
                          />
                        </pre>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="flex min-h-60 items-center justify-center rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
                Adicione exemplos de código no painel de edição.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
