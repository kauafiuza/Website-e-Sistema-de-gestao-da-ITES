import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { BlockProps } from "@/utils/blocks/types";
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
export function CompareClassicBlock({
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
          <div className="mt-8 overflow-x-auto">
            <Table className="w-full text-left text-sm">
              <caption className="sr-only">Comparação de planos</caption>
              <TableHeader>
                <TableRow>
                  {["Recurso", "Essencial", "Profissional"].map((text) => (
                    <TableHead key={text} className="border-b p-4">
                      {text}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["Projetos", "3", "Ilimitado"],
                  ["Armazenamento", "5 GB", "100 GB"],
                  ["Suporte", "Comunidade", "Prioritário"],
                ].map((row) => (
                  <TableRow key={row[0]}>
                    {row.map((text) => (
                      <TableCell key={text} className="border-b p-4">
                        {text}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      </div>
    </section>
  );
}
