import { useId, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/motion/card";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Checkbox } from "@/components/motion/checkbox";

import type { BlockProps, ContentItem } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

function SetupChecklist({
  items,
  editor,
}: {
  items: ContentItem[];
  editor?: InlineEditor;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const id = useId();
  return (
    <FieldGroup>
      <p role="status">
        {checked.length} of {items.length} steps completed locally
      </p>
      {items.map((item) => (
        <Field orientation="horizontal" key={item.id}>
          <Checkbox
            id={`${id}-${item.id}`}
            checked={checked.includes(item.id)}
            onCheckedChange={(value) =>
              setChecked((previous) =>
                value
                  ? [...previous, item.id]
                  : previous.filter((key) => key !== item.id),
              )
            }
          />
          <div>
            <FieldLabel htmlFor={`${id}-${item.id}`}>
              <InlineText
                editor={editor}
                target={{ kind: "item", id: item.id, key: "title" }}
                value={item.title}
                label="título da etapa"
              />
            </FieldLabel>
            <FieldDescription>
              <InlineText
                editor={editor}
                target={{ kind: "item", id: item.id, key: "description" }}
                value={item.description}
                label="instruções da etapa"
                multiline
              />
            </FieldDescription>
          </div>
        </Field>
      ))}
    </FieldGroup>
  );
}
export function OnboardingChecklistBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const items = p.items ?? [];
  return (
    <section
      className={`builder-block ${p.appearance === "tinted" ? "bg-secondary" : "bg-background"}`}
    >
      <header
        className={`mb-8 ${p.alignment === "center" ? "text-center" : "text-left"}`}
      >
        <p className="mb-3 text-xs tracking-widest text-primary">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "eyebrow" }}
            value={p.eyebrow}
            label="texto acima do título"
          />
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "title" }}
            value={p.title}
            label="título"
          />
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "description" }}
            value={p.description}
            label="descrição"
            multiline
          />
        </p>
      </header>

      {
        <Card>
          <CardHeader>
            <CardTitle>Próximas etapas</CardTitle>
            <CardDescription>
              A checklist you can complete in this session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SetupChecklist items={items} editor={editor} />
          </CardContent>
        </Card>
      }
    </section>
  );
}
