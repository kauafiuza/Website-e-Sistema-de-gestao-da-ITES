import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/motion/card";

import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/motion/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls";
import type { BlockProps, ContentItem } from "@/utils/blocks/types";
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing";
function ConfigurableTable({
  items,
  editor,
}: {
  items: ContentItem[];
  editor?: InlineEditor;
}) {
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const filtered = items
    .filter((item) =>
      `${item.title} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      ascending
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title),
    );
  const lastPage = Math.max(0, Math.ceil(filtered.length / 5) - 1);
  const current = Math.min(page, lastPage);
  return (
    <div className="flex flex-col gap-4">
      <Input
        aria-label="Buscar registros"
        placeholder="Buscar registros…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(0);
        }}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead aria-sort={ascending ? "ascending" : "descending"}>
              <Button
                variant="ghost"
                onClick={() => setAscending((value) => !value)}
              >
                Name {ascending ? "↑" : "↓"}
              </Button>
            </TableHead>
            <TableHead>Detalhes</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.slice(current * 5, current * 5 + 5).map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <InlineText
                  editor={editor}
                  target={{ kind: "item", id: item.id, key: "title" }}
                  value={item.title}
                  label="nome do registro"
                />
              </TableCell>
              <TableCell>
                <InlineText
                  editor={editor}
                  target={{ kind: "item", id: item.id, key: "description" }}
                  value={item.description}
                  label="detalhes do registro"
                  multiline
                />
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: item.id, key: "value" }}
                    value={item.value}
                    label="status do registro"
                  />
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!filtered.length && (
        <Empty
          role="status"
          className="min-h-36 rounded-lg border border-dashed p-6"
        >
          <EmptyHeader>
            <EmptyTitle className="text-base">Nenhum registro encontrado</EmptyTitle>
            <EmptyDescription>
              Tente outra busca para encontrar registros nesta tabela.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Anterior
        </Button>
        <p className="text-xs">
          Page {current + 1} of {lastPage + 1}
        </p>
        <Button
          variant="outline"
          disabled={current === lastPage}
          onClick={() => setPage(current + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
export function ProfileTabsBlock({
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
            <InlineImage
              editor={editor}
              url={p.imageUrl ?? ""}
              alt={p.imageAlt ?? p.title}
            >
              <Avatar className="size-16">
                <AvatarImage
                  src={safeImageUrl(p.imageUrl ?? "") || undefined}
                  alt={p.imageAlt || p.title}
                />
                <AvatarFallback>
                  {p.title.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </InlineImage>
            <CardTitle>
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="nome do perfil"
              />
            </CardTitle>
            <CardDescription>
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "description" }}
                value={p.description}
                label="descrição do perfil"
                multiline
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="about">
              <TabsList aria-label="Seções do perfil">
                <TabsTrigger value="about">Sobre</TabsTrigger>
                <TabsTrigger value="projects">Projetos</TabsTrigger>
              </TabsList>
              <TabsContent value="about">
                <p className="py-5 text-sm">
                  <InlineText
                    editor={editor}
                    target={{ kind: "property", key: "description" }}
                    value={p.description}
                    label="descrição do perfil"
                    multiline
                  />
                </p>
                <Button
                  variant="outline"
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
              </TabsContent>
              <TabsContent value="projects">
                <ConfigurableTable items={items} editor={editor} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      }
    </section>
  );
}
