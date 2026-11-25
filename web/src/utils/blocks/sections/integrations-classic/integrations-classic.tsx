import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/motion/card";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function IntegrationsClassicBlock({
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
            {[
              "GitHub",
              "Slack",
              "Notion",
              "Figma",
              "Linear",
              "Google Calendar",
            ].map((name) => (
              <Card key={name}>
                <CardHeader>
                  <CardTitle>{name}</CardTitle>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Bring your {name} workflow together in one workspace.
                  </p>
                </CardHeader>
                <CardFooter>
                  <a
                    className="mt-4 inline-block text-sm text-primary"
                    href={`https://${{ GitHub: "github.com", Slack: "slack.com", Notion: "notion.so", Figma: "figma.com", Linear: "linear.app", "Google Calendar": "calendar.google.com" }[name]}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explore {name} ↗
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        }
      </div>
    </section>
  );
}
