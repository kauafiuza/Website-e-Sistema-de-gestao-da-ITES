import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/motion/card";
import { useId } from "react";

import type { BlockProps } from "@/utils/blocks/types";
import { BouncyAccordion } from "@/components/motion/bouncy-accordion";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

export function ApplicationClassicBlock({
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
        <Card className="mt-8 text-left">
          <CardHeader>
            <CardTitle>Projetos do espaço de trabalho</CardTitle>
          </CardHeader>
          <CardContent className="flex">
            <aside className="w-36 border-r bg-muted p-5 text-sm">
              <p className="mb-5 font-semibold">Espaço de trabalho</p>
              <p>Projetos</p>
              <p className="mt-4">Pessoas</p>
              <p className="mt-4">Configurações</p>
            </aside>
            <div className="flex-1 p-6">
              <h3 className="font-medium">Seus projetos</h3>
              {["Reformulação do site", "Diretrizes da marca", "Lançamento do produto"].map(
                (n) => (
                  <BouncyAccordion
                    className="mt-4"
                    key={n}
                    items={[
                      {
                        id: n,
                        title: n,
                        description: "Em andamento · Atualizado hoje",
                      },
                    ]}
                  />
                ),
              )}
            </div>
          </CardContent>
        </Card>
      }
    </section>
  );
}
