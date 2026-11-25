import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls";
import type { BlockProps } from "@/utils/blocks/types";

import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing";
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
function ProductIllustration({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const url = safeImageUrl(p.imageUrl ?? "");
  const image = url ? (
    <img
      src={url}
      alt={p.imageAlt ?? ""}
      width={800}
      height={480}
      loading="lazy"
      className="aspect-[5/3] w-full rounded-xl object-cover"
    />
  ) : (
    <div
      className="grid min-h-64 gap-4 rounded-xl bg-secondary p-6 @md:grid-cols-3"
      aria-label="Espaço de trabalho ilustrado"
    >
      <div className="rounded-lg bg-card p-4">
        <p className="text-sm font-semibold">Nesta semana</p>
        <p className="mt-6 text-4xl text-primary">8</p>
        <p className="mt-2 text-xs">Ideias em andamento</p>
      </div>
      <div className="flex flex-col gap-3 @md:col-span-2">
        {["Planejar o lançamento", "Compartilhar a primeira versão", "Celebrar o progresso"].map(
          (task, i) => (
            <div
              className="flex items-center justify-between rounded-lg bg-card p-4"
              key={task}
            >
              <span className="text-sm">{task}</span>
              <Badge variant="secondary">{i === 2 ? "Próximo" : "Pronto"}</Badge>
            </div>
          ),
        )}
      </div>
    </div>
  );
  return (
    <InlineImage editor={editor} url={p.imageUrl ?? ""} alt={p.imageAlt ?? ""}>
      {image}
    </InlineImage>
  );
}
export function HeroEditorialBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  return (
    <section
      className={`builder-block builder-block--spacious ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${p.alignment === "center" ? "text-center" : "text-left"}`}
    >
      {
        <>
          {
            <div className={"grid items-center gap-8 @md:grid-cols-2"}>
              <div>
                <MarketingHeading props={p} editor={editor} />
                <MarketingLink props={p} editor={editor} />
              </div>
              <ProductIllustration props={p} editor={editor} />
            </div>
          }
        </>
      }
    </section>
  );
}
