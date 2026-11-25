import { Card, CardHeader } from "@/components/motion/card";
import { Progress } from "@/components/ui/progress";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function BentoClassicBlock({
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
          <div className="mt-8 grid gap-4 @md:grid-cols-3">
            <Card data-accent="primary" className="@md:col-span-2">
              <CardHeader>
                <p className="text-5xl">✧</p>
                <h3 className="mt-8 text-2xl font-semibold">Space to focus</h3>
                <p className="mt-4 text-sm">
                  Bring your projects and ideas into one calm workspace.
                </p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <p className="text-4xl">99.9%</p>
                <h3 className="mt-6 font-semibold">Sempre disponível</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Reliable tools for the work that matters.
                </p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Feito para sua equipe</h3>
                <p className="mt-4 text-sm text-muted-foreground">
                  Share a common vision and build together.
                </p>
                <div
                  className="mt-6 flex gap-2"
                  aria-label="Pessoas da equipe de exemplo"
                >
                  {["AM", "JL", "SK"].map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-muted p-3 text-xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </CardHeader>
            </Card>
            <Card data-accent="muted" className="@md:col-span-2">
              <CardHeader>
                <h3 className="text-2xl font-semibold">
                  Progress, at a glance
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  A clear view of every milestone.
                </p>
                <Progress
                  value={75}
                  aria-label="Progresso do projeto de exemplo"
                  className="mt-6"
                />
                <p className="mt-3 text-xs">Projeto de exemplo · 75% concluído</p>
              </CardHeader>
            </Card>
          </div>
        }
      </div>
    </section>
  );
}
