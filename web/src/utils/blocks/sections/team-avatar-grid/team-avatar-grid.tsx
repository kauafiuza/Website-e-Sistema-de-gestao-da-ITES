import { useId } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase()
}

export function TeamAvatarGridBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const sectionId = useId()

  return (
    <section id={sectionId} className="builder-block bg-background">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10 @md:gap-14">
          <header className="flex flex-col gap-4">
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance @md:text-4xl">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título"
              />
            </h2>
            <p className="max-w-5xl text-muted-foreground @md:text-lg">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "description" }}
                value={p.description}
                label="descrição"
                multiline
              />
            </p>
          </header>

          <div className="grid gap-6 @md:grid-cols-2 @4xl:grid-cols-4">
            {(p.items ?? []).map((member) => (
              <Card
                key={member.id}
                className="items-center border-0 bg-muted text-center shadow-none ring-0"
              >
                <CardContent className="flex flex-col items-center gap-4">
                  <InlineImage
                    editor={editor}
                    target={{ kind: "item", id: member.id, key: "href" }}
                    url={member.href}
                    alt={member.title}
                    className="!rounded-full"
                  >
                    <Avatar className="size-20 border @md:size-24">
                      <AvatarImage
                        src={safeImageUrl(member.href)}
                        alt={member.title}
                      />
                      <AvatarFallback>
                        {getInitials(member.title)}
                      </AvatarFallback>
                    </Avatar>
                  </InlineImage>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">
                      <InlineText
                        editor={editor}
                        target={{ kind: "item", id: member.id, key: "title" }}
                        value={member.title}
                        label="nome da pessoa"
                      />
                    </p>
                    <p className="text-muted-foreground">
                      <InlineText
                        editor={editor}
                        target={{ kind: "item", id: member.id, key: "value" }}
                        value={member.value}
                        label="cargo"
                      />
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
