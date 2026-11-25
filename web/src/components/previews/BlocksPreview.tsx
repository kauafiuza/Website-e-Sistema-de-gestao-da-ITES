import type { CSSProperties, ReactNode } from "react"
import { definitions } from "@/utils/blocks"
import type { Block } from "@/pages/editor/lib/document"
import { cn } from "@/lib/utils"

type Props = {
  blocks: readonly Block[]
  themeStyle?: CSSProperties
  className?: string
  emptyState?: ReactNode
}

/** Renders real catalog blocks inside a clipped, scaled preview canvas. */
export function BlocksPreview({
  blocks,
  themeStyle,
  className,
  emptyState,
}: Props) {
  const renderableBlocks = blocks.flatMap((block) => {
    const definition = definitions.get(block.definitionId)
    return definition ? [{ block, definition }] : []
  })

  if (renderableBlocks.length === 0) {
    return emptyState ? (
      <div
        aria-hidden="true"
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground",
          className
        )}
      >
        {emptyState}
      </div>
    ) : null
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "@container relative h-full w-full overflow-hidden",
        className
      )}
    >
      <div
        data-builder-content-preview=""
        style={themeStyle}
        inert
        className="pointer-events-none absolute top-0 left-0 w-[640px] origin-top-left scale-[calc(100cqw/640px)]"
      >
        {renderableBlocks.map(({ block, definition }) => (
          <div key={block.id} className="@container">
            <definition.component props={block.props} />
          </div>
        ))}
      </div>
    </div>
  )
}
