import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

function MarketingHeading({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  return (
    <header className="mb-8">
      <p className="mb-4 text-xs tracking-widest text-primary">
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
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        <InlineText
          editor={editor}
          target={{ kind: "property", key: "description" }}
          value={p.description}
          label="descrição"
          multiline
        />
      </p>
    </header>
  );
}
export function StatsEditorialBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const items = p.items ?? [];
  return (
    <section
      className={`builder-block builder-block--spacious ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${p.alignment === "center" ? "text-center" : "text-left"}`}
    >
      {
        <>
          {
            <>
              <MarketingHeading props={p} editor={editor} />

              {
                <div className="flex flex-col gap-4">
                  {items.map((item) => (
                    <div
                      className="grid items-baseline gap-4 border-b py-6 @md:grid-cols-[1fr_2fr_1fr]"
                      key={item.id}
                    >
                      <strong className="text-5xl text-primary tabular-nums">
                        <InlineText
                          editor={editor}
                          target={{ kind: "item", id: item.id, key: "value" }}
                          value={item.value}
                          label="valor da estatística"
                        />
                      </strong>
                      <h3 className="text-xl">
                        <InlineText
                          editor={editor}
                          target={{ kind: "item", id: item.id, key: "title" }}
                          value={item.title}
                          label="texto da estatística"
                        />
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        <InlineText
                          editor={editor}
                          target={{
                            kind: "item",
                            id: item.id,
                            key: "description",
                          }}
                          value={item.description}
                          label="descrição da estatística"
                          multiline
                        />
                      </p>
                    </div>
                  ))}
                </div>
              }
            </>
          }
        </>
      }
    </section>
  );
}
