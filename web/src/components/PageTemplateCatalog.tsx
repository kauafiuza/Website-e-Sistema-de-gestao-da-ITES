import type { CSSProperties } from "react"
import { Button } from "@/components/ui/button"
import { BlocksPreview } from "@/components/previews/BlocksPreview"
import { definitions } from "@/utils/blocks"
import { templates } from "@/utils/pages"
import type { PageTemplate } from "@/utils/pages/types"
import type { Block } from "@/pages/editor/lib/document"

type Props = {
  themeStyle?: CSSProperties
  mode: "catalog" | "preview"
  template?: PageTemplate
  onSelect?: (template: PageTemplate) => void
}

function templateBlocks(template: PageTemplate, compact: boolean): Block[] {
  const pageSections = compact ? template.blocks.slice(0, 3) : template.blocks
  return [
    ...(template.navbar ? [template.navbar] : []),
    ...pageSections,
  ].flatMap((definitionId, index) => {
    const definition = definitions.get(definitionId)
    return definition
      ? [{ id: `${definitionId}-${index}`, definitionId, props: definition.defaults }]
      : []
  })
}

function PageCanvas({
  template,
  themeStyle,
  className,
  compact = false,
}: {
  template: PageTemplate
  themeStyle?: CSSProperties
  className?: string
  compact?: boolean
}) {
  return (
    <BlocksPreview
      blocks={templateBlocks(template, compact)}
      themeStyle={themeStyle}
      className={className}
    />
  )
}

function PageDocument({
  template,
  themeStyle,
}: {
  template: PageTemplate
  themeStyle?: CSSProperties
}) {
  const blocks = templateBlocks(template, false).flatMap((block) => {
    const definition = definitions.get(block.definitionId)
    return definition ? [{ block, definition }] : []
  })

  return (
    <div
      className="@container w-full"
      data-builder-content-preview=""
      style={themeStyle}
      inert
    >
      {blocks.map(({ block, definition }) => (
        <div key={block.id} className="@container">
          <definition.component props={block.props} />
        </div>
      ))}
    </div>
  )
}

export function PageTemplateCatalog({
  themeStyle,
  mode,
  template,
  onSelect,
}: Props) {
  if (mode === "preview") {
    if (!template) return null
    return (
      <div className="w-full">
        <PageDocument template={template} themeStyle={themeStyle} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {templates.map((pageTemplate) => (
        <div
          key={pageTemplate.name}
          className="relative overflow-hidden rounded-xl border bg-card text-left transition-colors duration-200 focus-within:border-primary hover:border-primary"
        >
          <div
            className="@container relative h-36 overflow-hidden border-b"
            aria-hidden="true"
            inert
          >
            <PageCanvas
              template={pageTemplate}
              themeStyle={themeStyle}
              compact
              className="pointer-events-none absolute inset-0"
            />
          </div>
          <span className="flex items-center justify-between gap-1 p-3 text-xs font-medium">
            {pageTemplate.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="absolute inset-0 h-auto w-full rounded-xl p-0 focus-visible:outline-offset-[-3px]"
            aria-label={pageTemplate.name}
            onClick={() => onSelect?.(pageTemplate)}
          />
        </div>
      ))}
    </div>
  )
}
