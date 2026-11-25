import { Card, CardHeader, CardTitle } from "@/components/motion/card";
import { Badge } from "@/components/ui/badge";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function ChangelogClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  return (
    <section className="builder-block bg-background">
      <div className="mx-auto max-w-4xl">
        <p className="mb-4 text-xs font-semibold tracking-widest text-primary">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "eyebrow" }}
            value={p.eyebrow}
            label="texto acima do título"
          />
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "title" }}
            value={p.title}
            label="título"
          />
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "description" }}
            value={p.description}
            label="descrição"
            multiline
          />
        </p>

        {
          <ol className="mt-8 flex flex-col gap-6">
            {[
              "2.0 · Um espaço de trabalho mais ágil",
              "1.5 · Melhorias na colaboração",
              "1.0 · Nossa primeira versão",
            ].map((release, index) => (
              <li key={release}>
                <Card>
                  <CardHeader>
                    <Badge variant="secondary">
                      {["Novo", "Melhorado", "Lançamento"][index]}
                    </Badge>
                    <CardTitle>
                      <h3>{release}</h3>
                    </CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Thoughtful improvements to help you build and share your
                      work.
                    </p>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ol>
        }
      </div>
    </section>
  );
}
