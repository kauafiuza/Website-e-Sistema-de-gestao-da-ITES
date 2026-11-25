import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowDown,
  ArrowUp,
  Ellipsis,
  Pencil,
  Shuffle,
  Trash2,
} from "lucide-react"
import { memo, type CSSProperties, type Dispatch } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/motion/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { definitions, variantsByCategory } from "@/utils/blocks"
import type { Action, Block } from "../lib/document"

type OutlineActionsProps = {
  block: Block
  index: number
  count: number
  dispatch: Dispatch<Action>
  onEdit: (id: string) => void
  onSelect: (id: string) => void
}

function OutlineActions({
  block,
  index,
  count,
  dispatch,
  onEdit,
  onSelect,
}: OutlineActionsProps) {
  const definition = definitions.get(block.definitionId)!
  const canReplace =
    (variantsByCategory.get(definition.category)?.length ?? 0) > 1

  return (
    <>
      <div role="group">
        <ContextMenuLabel>Seção {index + 1}</ContextMenuLabel>
        <ContextMenuItem onSelect={() => onSelect(block.id)}>
          Selecionar seção
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onEdit(block.id)}>
          <Pencil /> Editar propriedades
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canReplace}
          onSelect={() => dispatch({ type: "replace", id: block.id })}
        >
          <Shuffle /> Trocar variação
        </ContextMenuItem>
      </div>
      <ContextMenuSeparator />
      <div role="group">
        <ContextMenuItem
          disabled={index === 0}
          onSelect={() =>
            dispatch({ type: "move", id: block.id, index: index - 1 })
          }
        >
          <ArrowUp /> Mover para cima
        </ContextMenuItem>
        <ContextMenuItem
          disabled={index === count - 1}
          onSelect={() =>
            dispatch({ type: "move", id: block.id, index: index + 1 })
          }
        >
          <ArrowDown /> Mover para baixo
        </ContextMenuItem>
      </div>
      <ContextMenuSeparator />
      <div role="group">
        <ContextMenuItem
          tone="destructive"
          onSelect={() => dispatch({ type: "remove", id: block.id })}
        >
          <Trash2 /> Excluir seção
        </ContextMenuItem>
      </div>
    </>
  )
}

function OutlineDropdownActions(props: OutlineActionsProps) {
  const { block, index, count, dispatch, onEdit, onSelect } = props
  const definition = definitions.get(block.definitionId)!
  const canReplace =
    (variantsByCategory.get(definition.category)?.length ?? 0) > 1

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>Seção {index + 1}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onSelect(block.id)}>
          Selecionar seção
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(block.id)}>
          <Pencil /> Editar propriedades
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canReplace}
          onClick={() => dispatch({ type: "replace", id: block.id })}
        >
          <Shuffle /> Trocar variação
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem
          disabled={index === 0}
          onClick={() =>
            dispatch({ type: "move", id: block.id, index: index - 1 })
          }
        >
          <ArrowUp /> Mover para cima
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={index === count - 1}
          onClick={() =>
            dispatch({ type: "move", id: block.id, index: index + 1 })
          }
        >
          <ArrowDown /> Mover para baixo
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => dispatch({ type: "remove", id: block.id })}
        >
          <Trash2 /> Excluir seção
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}

function UnknownOutlineSection({
  block,
  index,
  dispatch,
  onSelect,
}: Pick<OutlineActionsProps, "block" | "index" | "dispatch" | "onSelect">) {
  return (
    <div
      data-testid="outline-unknown-block"
      data-block-id={block.id}
      className="mb-2 rounded-md border border-dashed border-amber-500/50 bg-amber-500/5 p-2"
    >
      <p className="text-xs font-medium">Seção {index + 1}: bloco indisponível</p>
      <p className="mt-1 break-all text-[10px] text-muted-foreground">
        {block.definitionId} · preservado ao salvar
      </p>
      <div className="mt-2 flex justify-between gap-2">
        <Button variant="ghost" size="xs" onClick={() => onSelect(block.id)}>
          Selecionar
        </Button>
        <Button
          variant="destructive"
          size="xs"
          onClick={() => dispatch({ type: "remove", id: block.id })}
        >
          Excluir
        </Button>
      </div>
    </div>
  )
}

const OutlineSection = memo(function OutlineSection({
  block,
  themeStyle,
  index,
  count,
  dispatch,
  onEdit,
  selected,
  onSelect,
}: OutlineActionsProps & { selected: boolean; themeStyle: CSSProperties }) {
  const definition = definitions.get(block.definitionId)!
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `outline:${block.id}`,
    data: { instanceId: block.id, instanceIndex: index },
  })
  const actions = { block, index, count, dispatch, onEdit, onSelect }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          style={{ transform: CSS.Transform.toString(transform), transition }}
          data-testid="outline-block"
          data-block-id={block.id}
          {...attributes}
          {...listeners}
          aria-label={`Seção ${index + 1}: ${definition.name}. Pressione Shift+F10 para ver ações.`}
          aria-pressed={selected}
          onClick={() => onSelect(block.id)}
          className={`builder-outline-item group/outline mb-2 cursor-grab overflow-hidden rounded-md border border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
        >
          <div className="flex items-center justify-between gap-1 px-1.5 py-1">
            <span className="truncate text-xs font-medium">
              {definition.name}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Ações da seção ${index + 1}`}
                    className="size-6 shrink-0 opacity-0 transition-opacity group-hover/outline:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <OutlineDropdownActions {...actions} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div
            data-builder-content-preview=""
            style={themeStyle}
            className="@container relative h-20 overflow-hidden bg-muted/20"
          >
            <div
              className="@container pointer-events-none absolute top-0 left-0 w-[640px] origin-top-left scale-[calc(100cqw/640px)]"
              aria-hidden="true"
              inert
            >
              <definition.component
                props={block.props}
                preview
              />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-foreground/[0.06] transition-opacity group-hover/outline:bg-foreground/[0.04]"
            />
          </div>
          <div className="flex justify-end px-1.5 py-1">
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] leading-none font-medium text-muted-foreground">
              {definition.variant}
            </span>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent ariaLabel="Ações da seção">
        <OutlineActions {...actions} />
      </ContextMenuContent>
    </ContextMenu>
  )
})

export function Outline({
  themeStyle,
  blocks,
  dispatch,
  onEdit,
  selectedId,
  onSelect,
  onClear,
}: {
  themeStyle: CSSProperties
  blocks: Block[]
  dispatch: Dispatch<Action>
  selectedId: string | null
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onClear: () => void
}) {
  return (
    <aside
      aria-label="Seções da página"
      className="builder-ui glass-subtle hidden w-[200px] shrink-0 flex-col border-l bg-card xl:flex"
    >
      <div className="flex h-16 shrink-0 items-center justify-center border-b px-3">
        <Button
          variant="ghost"
          className="w-full rounded-md text-muted-foreground hover:text-destructive"
          disabled={!blocks.length}
          onClick={onClear}
        >
          <Trash2 />
          Limpar página
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {blocks.length ? (
            <SortableContext
              items={blocks.map((block) => `outline:${block.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block, index) => (
                definitions.has(block.definitionId) ? <OutlineSection
                  key={block.id}
                  block={block}
                  themeStyle={themeStyle}
                  index={index}
                  count={blocks.length}
                  dispatch={dispatch}
                  onEdit={onEdit}
                  selected={selectedId === block.id}
                  onSelect={onSelect}
                /> : <UnknownOutlineSection
                  key={block.id}
                  block={block}
                  index={index}
                  dispatch={dispatch}
                  onSelect={onSelect}
                />
              ))}
            </SortableContext>
          ) : (
            <Empty className="h-full gap-2 p-2">
              <EmptyHeader>
                <EmptyTitle className="text-sm">Nenhuma seção ainda</EmptyTitle>
                <EmptyDescription>
                  Adicione blocos pelo catálogo. Eles aparecerão aqui para
                  reorganização e edição.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
