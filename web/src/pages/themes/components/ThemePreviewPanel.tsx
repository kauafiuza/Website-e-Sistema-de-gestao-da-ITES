import { ScrollArea } from "@/components/ui/scroll-area"
import { PageTemplateCatalog } from "@/components/PageTemplateCatalog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select"
import { templates } from "@/utils/pages"
import {
  themeVariables,
  type ProjectTheme,
} from "@/pages/editor/lib/project-theme"
import type { ThemePreviewKind } from "../lib/theme-lab"

interface ThemePreviewPanelProps {
  theme: ProjectTheme
  preview: ThemePreviewKind
  onPreviewChange: (preview: ThemePreviewKind) => void
}

export function ThemePreviewPanel({
  theme,
  preview,
  onPreviewChange,
}: ThemePreviewPanelProps) {
  const selectedTemplate =
    templates.find((template) => template.name === preview) ?? templates[0]

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold">Pré-visualização ao vivo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize uma página pronta com o tema atual.
          </p>
        </div>
        <Select
          value={selectedTemplate.name}
          onValueChange={onPreviewChange}
          className="w-48 shrink-0"
        >
          <SelectTrigger aria-label="Página do catálogo" className="h-9">
            <SelectValue placeholder="Página do catálogo" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.name} value={template.name}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>
      <ScrollArea className="min-h-0 flex-1 bg-muted/30">
        <div className="min-h-full p-4 sm:p-7">
          <div
            className="builder-authored-content mx-auto min-h-full max-w-[920px] overflow-hidden border border-border bg-background text-foreground shadow-sm"
            style={{
              ...themeVariables(theme),
              fontFamily: "var(--builder-body-font)",
              fontSize: "calc(14px * var(--builder-body-scale))",
              lineHeight: "var(--builder-line-height)",
              letterSpacing: "var(--builder-letter-spacing)",
              borderRadius: "var(--builder-radius)",
            }}
          >
            <PageTemplateCatalog
              mode="preview"
              template={selectedTemplate}
              themeStyle={{
                ...themeVariables(theme),
                fontFamily: "var(--builder-body-font)",
                fontSize: "calc(14px * var(--builder-body-scale))",
                lineHeight: "var(--builder-line-height)",
                letterSpacing: "var(--builder-letter-spacing)",
                borderRadius: "var(--builder-radius)",
              }}
            />
          </div>
        </div>
      </ScrollArea>
    </section>
  )
}
