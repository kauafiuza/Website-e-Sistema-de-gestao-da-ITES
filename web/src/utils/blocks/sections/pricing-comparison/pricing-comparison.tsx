import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
function PricingComparison({
  items,
  props: p,
  editor,
}: {
  items: ContentItem[];
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={annual ? "annual" : "monthly"}
        onValueChange={(value) => setAnnual(value === "annual")}
      >
        <TabsList aria-label="Período de cobrança">
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
          <TabsTrigger value="annual">Anual · economize 20%</TabsTrigger>
        </TabsList>
      </Tabs>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plano</TableHead>
            <TableHead>Preço por mês</TableHead>
            <TableHead>Incluído</TableHead>
            <TableHead>Escolha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <InlineText
                  editor={editor}
                  target={{ kind: "item", id: item.id, key: "title" }}
                  value={item.title}
                  label="nome do plano"
                />
              </TableCell>
              <TableCell className="tabular-nums">
                {annual && Number.isFinite(Number(item.value)) ? (
                  `$${(Number(item.value) * 0.8).toFixed(2)}`
                ) : (
                  <>
                    $
                    <InlineText
                      editor={editor}
                      target={{ kind: "item", id: item.id, key: "value" }}
                      value={item.value}
                      label="preço do plano"
                    />
                  </>
                )}
              </TableCell>
              <TableCell>
                <ul>
                  {item.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  nativeButton={false}
                  role="link"
                  render={
                    <a
                      href={safeHref(item.href === "#" ? p.href : item.href)}
                    />
                  }
                >
                  <InlineText
                    editor={editor}
                    focusable={false}
                    target={{ kind: "property", key: "button" }}
                    value={p.button}
                    label="texto do botão"
                  />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
export function PricingComparisonBlock({
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

              {<PricingComparison items={items} props={p} editor={editor} />}
            </>
          }
        </>
      }
    </section>
  );
}
