import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/motion/card";
import { useId } from "react";

import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

export function ChartsClassicBlock({
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
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Receita mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end justify-around gap-3 border-b">
              {[32, 55, 44, 70, 65, 94].map((n, i) => (
                <div
                  key={i}
                  className="flex h-full w-full flex-col justify-end"
                >
                  <div
                    className="rounded-t bg-primary"
                    style={{ height: `${n}%` }}
                  />
                  <span className="mt-2 text-xs text-muted-foreground">
                    {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      }
    </section>
  );
}
