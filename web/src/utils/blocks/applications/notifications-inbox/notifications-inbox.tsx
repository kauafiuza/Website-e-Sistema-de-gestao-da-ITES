import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/motion/card";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

import type { BlockProps, ContentItem } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";

function NotificationList({
  items,
  editor,
}: {
  items: ContentItem[];
  editor?: InlineEditor;
}) {
  const [read, setRead] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = items.filter((item) => !hidden.includes(item.id));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => setRead(items.map((item) => item.id))}
        >
          Mark all as read
        </Button>
        <Button
          variant="ghost"
          disabled={!hidden.length}
          onClick={() => setHidden([])}
        >
          Restore dismissed
        </Button>
      </div>
      {visible.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>
              <InlineText
                editor={editor}
                target={{ kind: "item", id: item.id, key: "title" }}
                value={item.title}
                label="título da notificação"
              />
            </CardTitle>
            <CardDescription>
              <InlineText
                editor={editor}
                target={{ kind: "item", id: item.id, key: "description" }}
                value={item.description}
                label="mensagem da notificação"
                multiline
              />
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-wrap justify-between gap-2">
            <Badge variant={read.includes(item.id) ? "outline" : "secondary"}>
              {read.includes(item.id) ? "Lida" : "Não lida"}
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={read.includes(item.id)}
                onClick={() => setRead((previous) => [...previous, item.id])}
                aria-label={`Marcar ${item.title} como lida`}
              >
                Marcar como lida
              </Button>
              <Button
                variant="ghost"
                onClick={() => setHidden((previous) => [...previous, item.id])}
                aria-label={`Dispensar ${item.title}`}
              >
                Dispensar
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
      {!visible.length && (
        <Empty
          role="status"
          className="min-h-36 rounded-lg border border-dashed p-6"
        >
          <EmptyHeader>
            <EmptyTitle className="text-base">
              {hidden.length
                ? "Não há notificações para exibir"
                : "Nenhuma notificação por enquanto"}
            </EmptyTitle>
            <EmptyDescription>
              {hidden.length
                ? "Todas as notificações foram dispensadas. Selecione Restaurar para exibi-las novamente."
                : "As novas notificações aparecerão aqui."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
export function NotificationsInboxBlock({
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

      {<NotificationList items={items} editor={editor} />}
    </section>
  );
}
