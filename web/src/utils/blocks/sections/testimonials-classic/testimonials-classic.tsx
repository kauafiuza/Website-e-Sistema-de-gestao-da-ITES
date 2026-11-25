import { Card, CardContent, CardFooter } from "@/components/motion/card";
import { useId } from "react";

import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

export function TestimonialsClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const sectionId = useId();
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
      <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
        <InlineText
          editor={editor}
          target={{ kind: "property", key: "description" }}
          value={p.description}
          label="descrição"
          multiline
        />
      </p>
    </>
  );
  return (
    <section
      id={sectionId}
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${(p.alignment ?? "center") === "left" ? "text-left" : "text-center"}`}
    >
      {heading}

      {
        <div className="mt-9 grid gap-4 @md:grid-cols-3">
          {(p.items ?? []).map((item) => (
            <Card className="text-left" key={item.id}>
              <CardContent>
                <blockquote>
                  <p className="text-amber-500">★★★★★</p>
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: item.id, key: "description" }}
                    value={item.description}
                    label="depoimento"
                    as="p"
                    multiline
                    className="my-5 leading-7"
                  />
                </blockquote>
              </CardContent>
              <CardFooter className="text-sm font-medium">
                <InlineText
                  editor={editor}
                  target={{ kind: "item", id: item.id, key: "title" }}
                  value={item.title}
                  label="nome do autor"
                />
                <span className="block text-xs text-muted-foreground">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: item.id, key: "value" }}
                    value={item.value}
                    label="cargo e empresa"
                  />
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      }
    </section>
  );
}
