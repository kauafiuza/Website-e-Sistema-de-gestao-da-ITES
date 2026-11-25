import { memo, type Dispatch, type CSSProperties } from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDown, ArrowUp, Grip, Pencil, Shuffle, Trash2 } from "lucide-react"
import {
  Empty as EmptyState,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Button as MotionButton } from "@/components/motion/button/base"
import { Tooltip } from "@/components/motion/tooltip"
import { definitions, variantsByCategory } from "@/utils/blocks"
import { blockBackgroundStyle, blockFrameStyle } from "@/utils/blocks/shared/BlockFrame"
import "@/utils/blocks/shared/block-frame.css"
import type { Block, Action } from "../lib/document"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/motion/context-menu"
import { cn } from "@/lib/utils"
import {
  sameInlineTarget,
  type InlineEditor,
  type InlineTarget,
} from "@/utils/blocks/shared/inline-editing"
import { editableItems } from "@/utils/blocks/item-schemas"
import type { ContentItem } from "@/utils/blocks/types"
function Tool({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip content={label}>
      <MotionButton
        variant="ghost"
        size="icon"
        className="size-8 rounded-md"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </MotionButton>
    </Tooltip>
  )
}
function DropSlot({ index, dragging }: { index: number; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${index}`,
    data: { index },
  })
  return (
    <div
      ref={setNodeRef}
      data-testid={`slot-${index}`}
      className={cn(
        "relative rounded-lg transition-[height,background-color] duration-200",
        dragging && "h-14 bg-primary/5",
        isOver && "bg-primary/15"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-1/2 h-0.5 rounded-full",
          isOver ? "bg-primary" : "bg-transparent"
        )}
      />
      {isOver && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground">
          Inserir aqui
        </span>
      )}
    </div>
  )
}
function UnknownCanvasSection({
  block,
  index,
  count,
  dispatch,
  selected,
  onSelect,
}: {
  block: Block
  index: number
  count: number
  dispatch: Dispatch<Action>
  selected: boolean
  onSelect: (id: string) => void
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="unknown-canvas-block"
      data-block-id={block.id}
      data-selected={selected}
      aria-label="Bloco indisponível nesta versão. O conteúdo será preservado ao salvar."
      className={cn(
        "rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4",
        isDragging && "opacity-40"
      )}
      onClick={() => onSelect(block.id)}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="cursor-grab rounded p-1 text-muted-foreground"
          aria-label="Mover bloco indisponível"
        >
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Bloco indisponível nesta versão</p>
          <p className="mt-1 text-xs text-muted-foreground">
            O conteúdo será preservado ao salvar.
          </p>
        </div>
        <div className="flex gap-1">
          <Tool
            label="Mover para cima"
            disabled={index === 0}
            onClick={() =>
              dispatch({ type: "move", id: block.id, index: index - 1 })
            }
          >
            <ArrowUp size={13} />
          </Tool>
          <Tool
            label="Mover para baixo"
            disabled={index === count - 1}
            onClick={() =>
              dispatch({ type: "move", id: block.id, index: index + 1 })
            }
          >
            <ArrowDown size={13} />
          </Tool>
          <Tool
            label="Excluir bloco indisponível"
            onClick={() => dispatch({ type: "remove", id: block.id })}
          >
            <Trash2 size={13} />
          </Tool>
        </div>
      </div>
    </article>
  )
}
const CanvasSection = memo(function CanvasSection({
  block,
  index,
  count,
  dispatch,
  onEdit,
  selected,
  onSelect,
  inlineSelection,
  inlineEditing,
  onInlineSelect,
  onInlineStart,
  onInlineCommit,
  onInlineCancel,
  themeStyle,
  allowedDefinitionIds,
  isNavbar = false,
  regionLabel = "Cabeçalho do projeto",
  readOnly = false,
}: {
  block: Block
  index: number
  count: number
  dispatch: Dispatch<Action>
  onEdit: (id: string) => void
  selected: boolean
  onSelect: (id: string) => void
  inlineSelection: { blockId: string; target: InlineTarget } | null
  inlineEditing: { blockId: string; target: InlineTarget } | null
  onInlineSelect: (blockId: string, target: InlineTarget) => void
  onInlineStart: (blockId: string, target: InlineTarget) => void
  onInlineCommit: (blockId: string, target: InlineTarget, value: string) => void
  onInlineCancel: () => void
  themeStyle?: CSSProperties
  allowedDefinitionIds?: string[]
  isNavbar?: boolean
  regionLabel?: string
  readOnly?: boolean
}) {
  const definition = definitions.get(block.definitionId)!
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isNavbar })
  const variants = (variantsByCategory.get(definition.category) ?? []).filter(
    (variant) => !allowedDefinitionIds || allowedDefinitionIds.includes(variant.id)
  )
  const canReplace = variants.some((variant) => variant.id !== block.definitionId)
  const allowedProperties = new Set(definition.editableProperties)
  const editor: InlineEditor = {
    isEditable: (target) => {
      if (readOnly) return false
      if (target.kind === "property") return allowedProperties.has(target.key)
      if (target.kind === "item-feature")
        return Boolean(
          allowedProperties.has("items") &&
          editableItems[definition.category]?.featureLabels?.[target.index]
        )
      return Boolean(
        allowedProperties.has("items") &&
        editableItems[definition.category]?.[target.key]
      )
    },
    isSelected: (target) =>
      inlineSelection?.blockId === block.id &&
      sameInlineTarget(inlineSelection.target, target),
    isEditing: (target) =>
      inlineEditing?.blockId === block.id &&
      sameInlineTarget(inlineEditing.target, target),
    select: (target) => {
      onSelect(block.id)
      onInlineSelect(block.id, target)
    },
    start: (target) => {
      onSelect(block.id)
      onInlineStart(block.id, target)
    },
    commit: (target, value) => onInlineCommit(block.id, target, value),
    cancel: onInlineCancel,
    replaceItems: (items) => {
      if (!allowedProperties.has("items")) return
      dispatch({ type: "update", id: block.id, props: { items } })
    },
    commitImage: (
      url,
      alt,
      target = { kind: "property", key: "imageUrl" },
      altTarget
    ) => {
      if (target.kind === "property" && target.key === "imageUrl") {
        dispatch({
          type: "update",
          id: block.id,
          props: { imageUrl: url, imageAlt: alt },
        })
      } else if (
        target.kind === "item" &&
        (target.key === "href" || target.key === "value")
      ) {
        const items = block.props.items ?? []
        dispatch({
          type: "update",
          id: block.id,
          props: {
            items: items.map((item) => {
              if (item.id !== target.id) return item
              let updated: ContentItem = { ...item, [target.key]: url }
              if (altTarget?.kind === "item" && altTarget.id === item.id)
                updated = { ...updated, [altTarget.key]: alt }
              else if (
                altTarget?.kind === "item-feature" &&
                altTarget.id === item.id
              ) {
                const features = [...updated.features]
                features[altTarget.index] = alt
                updated = { ...updated, features }
              }
              return updated
            }),
          },
        })
      } else if (target.kind === "item-feature") {
        const items = block.props.items ?? []
        dispatch({
          type: "update",
          id: block.id,
          props: {
            items: items.map((item) => {
              if (item.id !== target.id) return item
              const features = [...item.features]
              features[target.index] = url
              let updated: ContentItem = { ...item, features }
              if (altTarget?.kind === "item" && altTarget.id === item.id)
                updated = { ...updated, [altTarget.key]: alt }
              else if (
                altTarget?.kind === "item-feature" &&
                altTarget.id === item.id
              ) {
                updated.features[altTarget.index] = alt
              }
              return updated
            }),
          },
        })
      }
      onInlineCancel()
    },
  }
  const inlineActive =
    inlineSelection?.blockId === block.id || inlineEditing?.blockId === block.id
  const boundaryFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (
      !target.closest(
        "[data-inline-editable], [data-inline-image], [data-inline-editor-control]"
      )
    )
      target.blur()
  }
  const boundaryKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (
      !target.closest(
        "[data-inline-editable], [data-inline-image], [data-inline-editor-control]"
      ) &&
      ["Enter", " "].includes(event.key)
    ) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <article
          ref={setNodeRef}
          style={{
            transform: CSS.Transform.toString(transform),
            transition,
          }}
          data-testid="canvas-block"
          data-definition={definition.id}
          data-selected={selected}
          data-inline-active={inlineActive}
          tabIndex={0}
          aria-label={isNavbar ? `${regionLabel}${readOnly ? ", área protegida" : ""}. Pressione Shift+F10 para ver ações.` : `Seção ${index + 1}: ${definition.name}. Pressione Shift+F10 para ver ações.`}
          className={cn(
            "group relative overflow-hidden bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            isNavbar && "overflow-visible",
            isDragging
              ? "z-20 opacity-40"
              : ""
          )}
        >
          <div className={cn(
            "z-10 flex items-center gap-1 bg-card/95 px-2 text-muted-foreground shadow-sm backdrop-blur-sm",
            isNavbar
              ? "relative h-0 min-h-0 overflow-hidden opacity-0 transition-[height,opacity] duration-150 group-hover:h-10 group-hover:min-h-10 group-hover:opacity-100 group-focus-within:h-10 group-focus-within:min-h-10 group-focus-within:opacity-100"
              : "pointer-events-none absolute inset-x-0 top-0 min-h-10 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
          )}>
            {!isNavbar && <MotionButton
              variant="ghost"
              size="icon"
              {...attributes}
              {...listeners}
              aria-label={`Mover ${definition.name}`}
              title={`Mover ${definition.name}`}
              pressScale={1}
              className="size-8 touch-none rounded-md"
            >
              <Grip size={16} />
            </MotionButton>}
            <MotionButton
              variant="ghost"
              size="sm"
              onClick={() => onSelect(block.id)}
              aria-label={`Selecionar ${definition.name}`}
              aria-pressed={selected}
              className="mr-auto min-w-0 truncate rounded-md px-2 text-left text-xs"
            >
              {isNavbar ? `${regionLabel}${readOnly ? " · Área compartilhada protegida" : " · Área compartilhada"}` : `${String(index + 1).padStart(2, "0")} ${definition.name}`}
            </MotionButton>
            <div
              className="builder-canvas-actions flex items-center gap-0.5 rounded-md px-0.5"
            >
              {!isNavbar && <Tool
                label="Mover para cima"
                disabled={index === 0}
                onClick={() =>
                  dispatch({ type: "move", id: block.id, index: index - 1 })
                }
              >
                <ArrowUp size={13} />
              </Tool>}
              {!isNavbar && <Tool
                label="Mover para baixo"
                disabled={index === count - 1}
                onClick={() =>
                  dispatch({ type: "move", id: block.id, index: index + 1 })
                }
              >
                <ArrowDown size={13} />
              </Tool>}
              <Tool label="Editar conteúdo" disabled={readOnly} onClick={() => onEdit(block.id)}>
                <Pencil size={13} />
              </Tool>
              <Tool
                label="Trocar variação"
                disabled={!canReplace || readOnly}
                onClick={() => dispatch({ type: "replace", id: block.id })}
              >
                <Shuffle size={13} />
              </Tool>
              <Tool
                label={isNavbar ? `Excluir ${regionLabel.toLowerCase()}` : "Excluir bloco"}
                disabled={readOnly}
                onClick={() => dispatch({ type: "remove", id: block.id })}
              >
                <Trash2 size={13} />
              </Tool>
            </div>
          </div>
          <div
            className="builder-authored-content @container pointer-events-none"
            style={themeStyle}
            onFocusCapture={boundaryFocus}
            onKeyDownCapture={boundaryKey}
            onClickCapture={(event) => {
              const target = event.target as HTMLElement
              if (
                !target.closest(
                  "[data-inline-editable], [data-inline-image], [data-inline-editor-control]"
                )
              ) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
          >
            <div
              className="builder-block-frame mx-auto min-w-0"
              data-block-button-style={block.props.buttonStyle && block.props.buttonStyle !== "theme" ? block.props.buttonStyle : undefined}
              data-block-custom-button-bg={block.props.buttonColor ? "true" : undefined}
              data-block-custom-button-text={block.props.buttonTextColor ? "true" : undefined}
              style={{ ...blockFrameStyle(block.props), ...blockBackgroundStyle(block.props) }}
            >
              <definition.component
                props={block.props}
                editor={editor}
              />
            </div>
          </div>
        </article>
      </ContextMenuTrigger>
      <CanvasSectionMenu
        blockId={block.id}
        index={index}
        count={count}
        canReplace={canReplace}
        dispatch={dispatch}
        onEdit={onEdit}
        onSelect={onSelect}
        inlineSelection={inlineSelection}
        onInlineStart={onInlineStart}
        isNavbar={isNavbar}
        regionLabel={regionLabel}
        readOnly={readOnly}
      />
    </ContextMenu>
  )
})

function CanvasSectionMenu({
  blockId,
  index,
  count,
  canReplace,
  dispatch,
  onEdit,
  onSelect,
  inlineSelection,
  onInlineStart,
  isNavbar = false,
  regionLabel = "Cabeçalho do projeto",
  readOnly = false,
}: {
  blockId: string
  index: number
  count: number
  canReplace: boolean
  dispatch: Dispatch<Action>
  onEdit: (id: string) => void
  onSelect: (id: string) => void
  inlineSelection: { blockId: string; target: InlineTarget } | null
  onInlineStart: (blockId: string, target: InlineTarget) => void
  isNavbar?: boolean
  regionLabel?: string
  readOnly?: boolean
}) {
  const selectedText =
    inlineSelection?.blockId === blockId ? inlineSelection.target : null
  const selectedImage =
    (selectedText?.kind === "property" && selectedText.key === "imageUrl") ||
    (selectedText?.kind === "item" &&
      (selectedText.key === "href" || selectedText.key === "value")) ||
    selectedText?.kind === "item-feature"

  return (
      <ContextMenuContent ariaLabel={isNavbar ? `Ações de ${regionLabel.toLowerCase()}` : `Ações da seção ${index + 1}`}>
      {readOnly ? <>
        <ContextMenuLabel>{regionLabel} · Área compartilhada protegida</ContextMenuLabel>
        <ContextMenuItem onSelect={() => onSelect(blockId)}>
          Selecionar área
        </ContextMenuItem>
      </> : <>
      <ContextMenuLabel>{isNavbar ? regionLabel : `Seção ${index + 1}`}</ContextMenuLabel>
      <ContextMenuItem onSelect={() => onSelect(blockId)}>
        {isNavbar ? `Selecionar ${regionLabel.toLowerCase()}` : "Selecionar seção"}
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onEdit(blockId)}>
        {isNavbar ? `Editar propriedades do ${regionLabel.toLowerCase()}` : "Editar propriedades"}
      </ContextMenuItem>
      {selectedText && !selectedImage && (
        <ContextMenuItem onSelect={() => onInlineStart(blockId, selectedText)}>
          Editar texto selecionado
        </ContextMenuItem>
      )}
      {selectedImage && (
        <ContextMenuItem onSelect={() => onEdit(blockId)}>
          Editar propriedades da imagem
        </ContextMenuItem>
      )}
      <ContextMenuItem
        disabled={!canReplace || readOnly}
        onSelect={() => dispatch({ type: "replace", id: blockId })}
      >
        Trocar variação
      </ContextMenuItem>
      {!isNavbar && <ContextMenuSeparator />}
      {!isNavbar && <ContextMenuItem
        disabled={index === 0}
        onSelect={() =>
          dispatch({ type: "move", id: blockId, index: index - 1 })
        }
      >
        Mover para cima
      </ContextMenuItem>}
      {!isNavbar && <ContextMenuItem
        disabled={index === count - 1}
        onSelect={() =>
          dispatch({ type: "move", id: blockId, index: index + 1 })
        }
      >
        Mover para baixo
      </ContextMenuItem>}
      {!isNavbar && <ContextMenuSeparator />}
      <ContextMenuItem
        tone="destructive"
        disabled={readOnly}
        onSelect={() => dispatch({ type: "remove", id: blockId })}
      >
        {isNavbar ? `Excluir ${regionLabel.toLowerCase()}` : "Excluir seção"}
      </ContextMenuItem>
      </>}
    </ContextMenuContent>
  )
}
export function Canvas({
  blocks,
  dispatch,
  onEdit,
  selectedId,
  onSelect,
  dragging,
  inlineSelection,
  inlineEditing,
  onInlineSelect,
  onInlineStart,
  onInlineCommit,
  onInlineCancel,
  themeStyle,
  allowedDefinitionIds,
}: {
  blocks: Block[]
  dispatch: Dispatch<Action>
  onEdit: (id: string) => void
  selectedId: string | null
  onSelect: (id: string) => void
  dragging: boolean
  inlineSelection: { blockId: string; target: InlineTarget } | null
  inlineEditing: { blockId: string; target: InlineTarget } | null
  onInlineSelect: (blockId: string, target: InlineTarget) => void
  onInlineStart: (blockId: string, target: InlineTarget) => void
  onInlineCommit: (blockId: string, target: InlineTarget, value: string) => void
  onInlineCancel: () => void
  themeStyle?: CSSProperties
  allowedDefinitionIds?: string[]
}) {
  return (
    <SortableContext
      items={blocks.map((b) => b.id)}
      strategy={verticalListSortingStrategy}
    >
      {blocks.length > 0 && <DropSlot index={0} dragging={dragging} />}
      {blocks.length === 0 ? (
        <Empty />
      ) : (
        blocks.map((b, i) => (
          <div key={b.id}>
            {definitions.has(b.definitionId) ? <CanvasSection
              block={b}
              index={i}
              count={blocks.length}
              dispatch={dispatch}
              onEdit={onEdit}
              selected={selectedId === b.id}
              onSelect={onSelect}
              inlineSelection={
                inlineSelection?.blockId === b.id ? inlineSelection : null
              }
              inlineEditing={
                inlineEditing?.blockId === b.id ? inlineEditing : null
              }
              onInlineSelect={onInlineSelect}
              onInlineStart={onInlineStart}
              onInlineCommit={onInlineCommit}
              onInlineCancel={onInlineCancel}
              themeStyle={themeStyle}
              allowedDefinitionIds={allowedDefinitionIds}
            /> : <UnknownCanvasSection
              block={b}
              index={i}
              count={blocks.length}
              dispatch={dispatch}
              selected={selectedId === b.id}
              onSelect={onSelect}
            />}
            <DropSlot index={i + 1} dragging={dragging} />
          </div>
        ))
      )}
    </SortableContext>
  )
}

export function ProjectNavbarEditor({
  block,
  dispatch,
  onEdit,
  selected,
  onSelect,
  inlineSelection,
  inlineEditing,
  onInlineSelect,
  onInlineStart,
  onInlineCommit,
  onInlineCancel,
  themeStyle,
  regionLabel = "Cabeçalho do projeto",
  protectedRegion = false,
}: {
  block: Block
  dispatch: Dispatch<Action>
  onEdit: (id: string) => void
  selected: boolean
  onSelect: (id: string) => void
  inlineSelection: { blockId: string; target: InlineTarget } | null
  inlineEditing: { blockId: string; target: InlineTarget } | null
  onInlineSelect: (blockId: string, target: InlineTarget) => void
  onInlineStart: (blockId: string, target: InlineTarget) => void
  onInlineCommit: (blockId: string, target: InlineTarget, value: string) => void
  onInlineCancel: () => void
  themeStyle?: CSSProperties
  regionLabel?: string
  protectedRegion?: boolean
}) {
  if (!definitions.has(block.definitionId)) {
    return (
      <div
        data-testid={regionLabel === "Rodapé do projeto" ? "unknown-footer" : "unknown-navbar"}
        aria-label={`${regionLabel} indisponível nesta versão. O conteúdo será preservado ao salvar.`}
        className="flex items-center gap-3 border-b border-dashed border-amber-500/50 bg-amber-500/5 px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{regionLabel} indisponível nesta versão</p>
          <p className="text-xs text-muted-foreground">
            O conteúdo será preservado ao salvar.
          </p>
        </div>
        <MotionButton
          variant="outline"
          size="sm"
          disabled={protectedRegion}
          onClick={() => dispatch({ type: "remove", id: block.id })}
        >
          Excluir {regionLabel.toLowerCase()}
        </MotionButton>
      </div>
    )
  }
  return (
    <SortableContext items={[]} strategy={verticalListSortingStrategy}>
      <CanvasSection
        block={block}
        index={0}
        count={0}
        dispatch={dispatch}
        onEdit={onEdit}
        selected={selected}
        onSelect={onSelect}
        inlineSelection={inlineSelection}
        inlineEditing={inlineEditing}
        onInlineSelect={onInlineSelect}
        onInlineStart={onInlineStart}
        onInlineCommit={onInlineCommit}
        onInlineCancel={onInlineCancel}
        themeStyle={themeStyle}
        isNavbar
        regionLabel={regionLabel}
        readOnly={protectedRegion}
      />
    </SortableContext>
  )
}
function Empty() {
  const { setNodeRef, isOver } = useDroppable({
    id: "empty",
    data: { index: 0 },
  })
  return (
    <EmptyState
      ref={setNodeRef}
      className={cn(
        "min-h-[calc(100svh-var(--builder-header-height)-48px)] rounded-xl border border-dashed p-6",
        isOver
          ? "border-primary bg-secondary"
          : "builder-empty-canvas border-border"
      )}
    >
      <EmptyHeader className="max-w-lg">
        <EmptyTitle className="text-sm font-medium">
          Esta página está vazia.
        </EmptyTitle>
        <EmptyDescription className="text-base">
          Escolha um bloco no catálogo. Clique no nome para adicioná-lo ou
          arraste-o para a página.
        </EmptyDescription>
      </EmptyHeader>
    </EmptyState>
  )
}
