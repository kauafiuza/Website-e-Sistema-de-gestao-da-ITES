import { useId } from "react";

import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

export function TimelineClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const sectionId = useId();
  const heading = (
    <>
      <p className="mb-4 text-xs font-semibold tracking-[.18em] text-primary">
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
      <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
        <InlineText
          editor={editor}
          target={{ kind: "property", key: "description" }}
          value={p.description}
          label="descrição"
          multiline
        />
      </p>
    </>
  );
  return (
    <section
      id={sectionId}
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"} ${(p.alignment ?? "center") === "left" ? "text-left" : "text-center"}`}
    >
      {heading}

      {
        <ol className="mx-auto mt-8 max-w-xl border-l text-left">
          {["A ideia", "Nossa primeira versão", "Crescendo juntos"].map((n, i) => (
            <li className="relative mb-7 pl-8" key={n}>
              <span className="absolute top-1 -left-1.5 size-3 rounded-full bg-primary" />
              <span className="text-xs text-primary">202{3 + i}</span>
              <h3 className="mt-2 font-medium">{n}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Another step toward something better.
              </p>
            </li>
          ))}
        </ol>
      }
    </section>
  );
}
