import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/motion/switch";
import { Separator } from "@/components/ui/separator";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

function Preferences({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const id = useId();
  const [saved, setSaved] = useState(false);
  const [updates, setUpdates] = useState(true);
  const [summary, setSummary] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>Nome de exibição</FieldLabel>
          <Input
            id={`${id}-name`}
            name="displayName"
            autoComplete="name"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-email`}>E-mail</FieldLabel>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Separator />
        <Field orientation="horizontal">
          <Switch
            label="Atualizações por e-mail"
            checked={updates}
            onCheckedChange={setUpdates}
          />
        </Field>
        <Field orientation="horizontal">
          <Switch
            label="Resumo semanal"
            checked={summary}
            onCheckedChange={setSummary}
          />
        </Field>
        <FieldDescription>
          Preferences apply to this demo session. Connect your account API to
          save them.
        </FieldDescription>
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
          {saved
            ? "Demonstração: as preferências foram verificadas localmente e não foram salvas em uma conta."
            : ""}
        </p>
      </FieldGroup>
    </form>
  );
}
export function SettingsPreferencesBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
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
            <CardTitle>Preferências pessoais</CardTitle>
            <CardDescription>
              Manage how you use your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Preferences props={p} editor={editor} />
          </CardContent>
        </Card>
      }
    </section>
  );
}
