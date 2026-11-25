import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function MultiStepClassicBlock({
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

        {<MultiStepForm props={p} editor={editor} />}
      </div>
    </section>
  );
}
function MultiStepForm({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState({ name: "", email: "" });
  const id = useId();
  return (
    <form
      className="mt-8 max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === 1) setStep(2);
        else setSubmitted(true);
      }}
    >
      <FieldGroup>
        <p className="text-sm text-muted-foreground">Step {step} of 2</p>
        {step === 1 ? (
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>Seu nome</FieldLabel>
            <Input
              id={`${id}-name`}
              required
              name="name"
              value={details.name}
              onChange={(event) =>
                setDetails((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              autoComplete="name"
            />
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor={`${id}-email`}>E-mail</FieldLabel>
            <Input
              id={`${id}-email`}
              required
              name="email"
              value={details.email}
              onChange={(event) =>
                setDetails((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
              type="email"
              autoComplete="email"
              spellCheck={false}
            />
          </Field>
        )}
        <div className="flex gap-3">
          {step === 2 && (
            <Button variant="outline" type="button" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <Button type="submit">
            {step === 1 ? (
              "Continuar"
            ) : (
              <InlineText
                editor={editor}
                focusable={false}
                target={{ kind: "property", key: "button" }}
                value={p.button}
                label="texto do botão"
              />
            )}
          </Button>
        </div>
        <p role="status">
          {submitted
            ? "Demonstração: sua solicitação foi verificada localmente e não foi enviada nem salva."
            : ""}
        </p>
      </FieldGroup>
    </form>
  );
}
