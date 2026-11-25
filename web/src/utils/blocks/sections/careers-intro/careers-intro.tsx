import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
import { safeHref } from "@/utils/blocks/shared/urls";
import type { BlockProps } from "@/utils/blocks/types";

const MAX_REASONS = 3;

export function CareersIntroBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const sectionId = useId();
  const reasons = (p.items ?? []).slice(0, MAX_REASONS);

  return (
    <section id={sectionId} className="builder-block bg-background">
      <div className="container mx-auto">
        <div className="flex flex-col gap-12 @md:gap-16">
          <header className="flex flex-col items-start gap-6">
            {p.eyebrow ? (
              <Badge variant="outline" className="w-fit">
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "eyebrow" }}
                  value={p.eyebrow}
                  label="rótulo"
                />
              </Badge>
            ) : null}
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance @md:text-6xl">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título"
              />
            </h1>
            <p className="max-w-5xl text-lg text-balance text-muted-foreground">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "description" }}
                value={p.description}
                label="descrição"
                multiline
              />
            </p>
            {p.button ? (
              <Button
                type="button"
                nativeButton={false}
                role="link"
                className="pointer-events-auto"
                data-inline-editor-control=""
                render={<a href={safeHref(p.href)} />}
              >
                <InlineText
                  editor={editor}
                  focusable={false}
                  target={{ kind: "property", key: "button" }}
                  value={p.button}
                  label="texto do botão"
                />
              </Button>
            ) : null}
          </header>

          <ul className="grid gap-8 border-t border-border pt-8 @md:grid-cols-3 @md:gap-10 @md:pt-10">
            {reasons.map((reason) => (
              <li key={reason.id} className="flex flex-col gap-3">
                <h2 className="text-lg font-medium">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: reason.id, key: "title" }}
                    value={reason.title}
                    label="título do motivo"
                  />
                </h2>
                <p className="text-muted-foreground">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: reason.id, key: "description" }}
                    value={reason.description}
                    label="descrição do motivo"
                    multiline
                  />
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
