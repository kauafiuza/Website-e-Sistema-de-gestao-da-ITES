import { Button } from "@/components/ui/button";
import { safeHref } from "@/utils/blocks/shared/urls";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

function MarketingLink({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  return (
    <Button
      nativeButton={false}
      role="link"
      render={<a href={safeHref(p.href)} />}
    >
      <InlineText
        editor={editor}
        focusable={false}
        target={{ kind: "property", key: "button" }}
        value={p.button}
        label="texto do botão"
      />
    </Button>
  );
}
export function FooterDirectoryBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const items = p.items ?? [];
  return (
    <section
      className={`builder-block builder-block--footer ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${p.alignment === "center" ? "text-center" : "text-left"}`}
    >
      {
        <footer className="grid gap-8 @md:grid-cols-3">
          <div>
            <h2 className="text-xl font-semibold">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título do site"
              />
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "description" }}
                value={p.description}
                label="descrição"
                multiline
              />
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <a href={safeHref(item.href)} key={item.id}>
                <InlineText
                  editor={editor}
                  focusable={false}
                  target={{ kind: "item", id: item.id, key: "title" }}
                  value={item.title}
                  label="texto da navegação"
                />
              </a>
            ))}
          </div>
          <div>
            <p className="text-sm">Fale com a gente</p>
            <div className="mt-4">
              <MarketingLink props={p} editor={editor} />
            </div>
          </div>
        </footer>
      }
    </section>
  );
}
