import { Badge } from "@/components/ui/badge";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

export function ActivityFeedBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const items = p.items ?? [];
  return (
    <section
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"}`}
    >
      <header
        className={`mb-8 ${p.alignment === "center" ? "text-center" : "text-left"}`}
      >
        <p className="mb-3 text-xs tracking-widest text-primary">
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
      </header>

      {
        <ol className="flex flex-col gap-6 border-l pl-6">
          {items.map((item) => (
            <li key={item.id}>
              <Badge variant="outline">
                <InlineText
                  editor={editor}
                  target={{ kind: "item", id: item.id, key: "value" }}
                  value={item.value}
                  label="horário do evento"
                />
              </Badge>
              <h3 className="mt-3 font-medium">
                <InlineText
                  editor={editor}
                  target={{ kind: "item", id: item.id, key: "title" }}
                  value={item.title}
                  label="título da atividade"
                />
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                <InlineText
                  editor={editor}
                  target={{ kind: "item", id: item.id, key: "description" }}
                  value={item.description}
                  label="detalhes da atividade"
                  multiline
                />
              </p>
            </li>
          ))}
        </ol>
      }
    </section>
  );
}
