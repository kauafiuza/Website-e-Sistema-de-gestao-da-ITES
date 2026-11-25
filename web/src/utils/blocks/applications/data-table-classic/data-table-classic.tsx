import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function DataTableClassicBlock({
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

        {<ProjectTable />}
      </div>
    </section>
  );
}
function ProjectTable() {
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(true);
  const projects = ["Reformulação do site", "Aplicativo para celular", "Sistema de design"]
    .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (ascending ? a.localeCompare(b) : b.localeCompare(a)));
  return (
    <div className="mt-8">
      <Input
        aria-label="Filtrar projetos"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filtrar projetos…"
        className="mb-4 max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead aria-sort={ascending ? "ascending" : "descending"}>
              <Button
                variant="ghost"
                onClick={() => setAscending((value) => !value)}
              >
                Project {ascending ? "↑" : "↓"}
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project}>
              <TableCell>{project}</TableCell>
              <TableCell>
                <Badge variant="secondary">Em andamento</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!projects.length && (
        <Empty
          role="status"
          className="min-h-36 rounded-lg border border-dashed p-6"
        >
          <EmptyHeader>
            <EmptyTitle className="text-base">Nenhum projeto encontrado</EmptyTitle>
            <EmptyDescription>
              Try another search term to find a project.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
