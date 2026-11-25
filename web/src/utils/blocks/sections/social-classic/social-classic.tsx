import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { useId } from "react";

import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

export function SocialClassicBlock({
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
        <div className="mt-9 flex flex-col items-center gap-4">
          <AvatarGroup>
            {["AM", "JL", "SR", "TK", "CW"].map((n) => (
              <Avatar key={n} size="lg">
                <AvatarFallback>{n}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
          <p className="text-primary" aria-label="Cinco estrelas em cinco">
            ★★★★★
          </p>
          <p className="text-sm text-muted-foreground">
            4.9 out of 5 · Trusted by 10,000+ creative teams
          </p>
        </div>
      }
    </section>
  );
}
