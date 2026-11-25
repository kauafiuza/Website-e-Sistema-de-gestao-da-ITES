import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/motion/checkbox";
import { useState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function AccountClassicBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  return (
    <section className="builder-block bg-background">
      <div className="mx-auto max-w-4xl">
        <p className="mb-4 text-xs font-semibold tracking-widest text-primary">
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

        {<AccountForm props={p} editor={editor} />}
      </div>
    </section>
  );
}
function AccountForm({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const id = useId();
  return (
    <form
      className="mt-8 max-w-lg"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-displayName`}>Nome de exibição</FieldLabel>
          <Input
            id={`${id}-displayName`}
            name="displayName"
            autoComplete="name"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-email`}>E-mail</FieldLabel>
          <Input
            id={`${id}-email`}
            name="profileEmail"
            autoComplete="email"
            type="email"
            required
            spellCheck={false}
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox
            checked={notifications}
            onCheckedChange={setNotifications}
            label="Receber novidades do produto"
          />
        </Field>
        <Button type="submit">
          <InlineText
            editor={editor}
            focusable={false}
            target={{ kind: "property", key: "button" }}
            value={p.button}
            label="texto do botão"
          />
        </Button>
        <p role="status">
          {submitted
            ? "Demonstração: as preferências do perfil foram alteradas nesta prévia e não foram salvas em uma conta."
            : ""}
        </p>
      </FieldGroup>
    </form>
  );
}
