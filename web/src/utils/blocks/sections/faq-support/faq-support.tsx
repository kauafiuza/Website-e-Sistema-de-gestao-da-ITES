import { BouncyAccordion } from "@/components/motion/bouncy-accordion";
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
export function FaqSupportBlock({
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
                <div className="grid gap-8 @md:grid-cols-2">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Find an answer below, or use the contact link to ask our
                    team.
                  </p>
                  <BouncyAccordion
                    items={items.map((item) => ({
                      id: item.id,
                      title: (
                        <InlineText
                          editor={editor}
                          focusable={false}
                          target={{ kind: "item", id: item.id, key: "title" }}
                          value={item.title}
                          label="pergunta"
                        />
                      ),
                      description: (
                        <InlineText
                          editor={editor}
                          target={{
                            kind: "item",
                            id: item.id,
                            key: "description",
                          }}
                          value={item.description}
                          label="resposta"
                          multiline
                        />
                      ),
                    }))}
                  />
                </div>
              }
            </>
          }
        </>
      }
    </section>
  );
}
