import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/motion/card";

import { Button } from "@/components/ui/button";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function DownloadClassicBlock({
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
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Anotações para levar com você</CardTitle>
              <CardDescription>
                <p>
                  A portable text file containing this section’s configured
                  heading and description.
                </p>
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([`${p.title}\n\n${p.description}`], {
                      type: "text/plain",
                    }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "notes.txt";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "button" }}
                  value={p.button}
                  label="texto do botão"
                />
              </Button>
            </CardFooter>
          </Card>
        }
      </div>
    </section>
  );
}
