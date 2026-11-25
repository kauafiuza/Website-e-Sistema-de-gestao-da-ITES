import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function ForgotPasswordClassicBlock({
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
        {
          <AuthenticationForm
            category={"forgot-password"}
            props={p}
            editor={editor}
          />
        }
      </div>
    </section>
  );
}
function AuthenticationForm({
  category,
  props: p,
  editor,
}: {
  category: string;
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const [submitted, setSubmitted] = useState(false);
  const id = useId();
  return (
    <form
      className="mt-8 max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <FieldGroup>
        {category === "register" && (
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>Nome</FieldLabel>
            <Input id={`${id}-name`} required name="name" autoComplete="name" />
          </Field>
        )}
        {!["two-factor", "reset-password"].includes(category) && (
          <Field>
            <FieldLabel htmlFor={`${id}-email`}>E-mail</FieldLabel>
            <Input
              id={`${id}-email`}
              required
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
            />
          </Field>
        )}
        {["register", "reset-password"].includes(category) && (
          <Field>
            <FieldLabel htmlFor={`${id}-password`}>Senha</FieldLabel>
            <Input
              id={`${id}-password`}
              required
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
            />
          </Field>
        )}
        {category === "two-factor" && (
          <Field>
            <FieldLabel htmlFor={`${id}-code`}>Código de verificação</FieldLabel>
            <Input
              id={`${id}-code`}
              required
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              spellCheck={false}
            />
          </Field>
        )}
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
            ? "Demonstração: os dados passaram pela validação local. Nenhuma conta foi criada, nenhum código foi enviado e nenhuma senha foi alterada."
            : ""}
        </p>
      </FieldGroup>
    </form>
  );
}
