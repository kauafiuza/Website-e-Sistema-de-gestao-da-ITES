
import type { BlockProps } from "@/utils/blocks/types";
import { safeHref } from "@/utils/blocks/shared/urls";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

export function FooterSplitBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  return (
    <footer className="builder-block builder-block--footer flex flex-wrap justify-between gap-8 border-t">
      <div>
        <strong className="text-xl">
          ✳{" "}
          <InlineText
            editor={editor}
            focusable={false}
            target={{ kind: "property", key: "title" }}
            value={p.title}
            label="título do site"
          />
        </strong>
        <p className="mt-3 text-sm text-muted-foreground">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "description" }}
            value={p.description}
            label="descrição"
            multiline
          />
        </p>
      </div>
      <div className={"grid grid-cols-2 gap-x-12 gap-y-4 text-sm"}>
        {(p.items ?? []).map((item) => (
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
        <span>© {new Date().getFullYear()} Studio</span>
      </div>
    </footer>
  );
}
