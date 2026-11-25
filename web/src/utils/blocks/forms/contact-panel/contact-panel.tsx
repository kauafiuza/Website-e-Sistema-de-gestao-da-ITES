import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/motion/card";
import { FieldGroup } from "@/components/ui/field";
import { FormFields, defaultFormFields } from "@/utils/blocks/shared/FormFields";
import { Separator } from "@/components/ui/separator";
import { safeHref } from "@/utils/blocks/shared/urls";
import type { BlockProps } from "@/utils/blocks/types";
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
function ContactPanel({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const [sent, setSent] = useState(false);
  return (
    <div className="grid gap-8 @md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inicie uma conversa</CardTitle>
          <CardDescription>Conte um pouco sobre o que você precisa.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href={safeHref(p.href)} className="text-primary">
            <InlineText
              editor={editor}
              focusable={false}
              target={{ kind: "property", key: "button" }}
              value={p.button}
              label="texto do botão"
            />
          </a>
          <Separator className="my-6" />
          <p className="text-sm text-muted-foreground">
            Form validation works locally. Connect a delivery service to send
            messages.
          </p>
        </CardContent>
      </Card>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}
      >
        <FieldGroup>
          <FormFields fields={p.formFields ?? defaultFormFields["contact-panel"]} />
          <Button type="submit">Enviar mensagem</Button>
          <p role="status">
            {sent ? "Mensagem validada localmente. Nenhuma mensagem foi enviada." : ""}
          </p>
        </FieldGroup>
      </form>
    </div>
  );
}
export function ContactPanelBlock({
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
            <>
              <MarketingHeading props={p} editor={editor} />

              {<ContactPanel props={p} editor={editor} />}
            </>
          }
        </>
      }
    </section>
  );
}
