import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/motion/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/motion/tabs";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
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
function FeatureTabs({
  items,
  editor,
}: {
  items: ContentItem[];
  editor?: InlineEditor;
}) {
  if (!items.length)
    return (
      <Empty
        role="status"
        className="min-h-36 rounded-lg border border-dashed p-6"
      >
        <EmptyHeader>
          <EmptyTitle className="text-base">Nenhum recurso para exibir</EmptyTitle>
          <EmptyDescription>
            Add feature items in Edit content to populate these tabs.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <Tabs defaultValue={items[0].id} variant="underline">
      <TabsList className="max-w-full flex-wrap">
        {items.map((item) => (
          <TabsTrigger value={item.id} key={item.id}>
            <InlineText
              editor={editor}
              focusable={false}
              target={{ kind: "item", id: item.id, key: "title" }}
              value={item.title}
              label="texto da aba do recurso"
            />
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent value={item.id} key={item.id}>
          <Card className="mt-6">
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
                  target={{ kind: "item", id: item.id, key: "description" }}
                  value={item.description}
                  label="descrição do recurso"
                  multiline
                />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg bg-secondary p-8 text-4xl text-primary"
                aria-hidden="true"
              >
                ✧
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
export function FeaturesTabsBlock({
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
              {<FeatureTabs items={items} editor={editor} />}
            </>
          }
        </>
      }
    </section>
  );
}
