import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/motion/card";
import { safeHref } from "@/utils/blocks/shared/urls";

import type { BlockProps, ContentItem } from "@/utils/blocks/types";
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
function ResourceDownload({
  item,
  label,
  editor,
}: {
  item: ContentItem;
  label: string;
  editor?: InlineEditor;
}) {
  if (item.href !== "#" && safeHref(item.href) !== "#")
    return (
      <Button
        variant="outline"
        nativeButton={false}
        role="link"
        render={<a href={safeHref(item.href)} download />}
      >
        <InlineText
          editor={editor}
          focusable={false}
          target={{ kind: "property", key: "button" }}
          value={label}
          label="texto do botão de download"
        />
      </Button>
    );
  return (
    <Button
      variant="outline"
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([`${item.title}\n\n${item.description}`], {
            type: "text/plain",
          }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${item.title.replace(/[^a-z0-9]/gi, "-") || "resource"}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
      }}
    >
      <InlineText
        editor={editor}
        focusable={false}
        target={{ kind: "property", key: "button" }}
        value={label}
        label="texto do botão de download"
      />
    </Button>
  );
}
export function DownloadResourcesBlock({
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
                <div className="grid gap-6 @md:grid-cols-3">
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <CardTitle>
                          <InlineText
                            editor={editor}
                            target={{ kind: "item", id: item.id, key: "title" }}
                            value={item.title}
                            label="título do recurso"
                          />
                        </CardTitle>
                        <CardDescription>
                          <InlineText
                            editor={editor}
                            target={{
                              kind: "item",
                              id: item.id,
                              key: "description",
                            }}
                            value={item.description}
                            label="descrição do recurso"
                            multiline
                          />
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <ResourceDownload
                          item={item}
                          label={p.button}
                          editor={editor}
                        />
                      </CardFooter>
                    </Card>
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
