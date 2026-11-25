import {
  createElement,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react"
import type { ContentItem } from "@/utils/blocks/types"
import { Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/motion/popover"

export type InlineProperty =
  | "title"
  | "highlight"
  | "description"
  | "button"
  | "href"
  | "eyebrow"
  | "imageUrl"
  | "imageAlt"
export type InlineItemProperty = "title" | "description" | "href" | "value"
export type InlineTarget =
  | { kind: "property"; key: InlineProperty }
  | { kind: "item"; id: string; key: InlineItemProperty }
  | { kind: "item-feature"; id: string; index: number }

export interface InlineEditor {
  isEditable: (target: InlineTarget) => boolean
  isSelected: (target: InlineTarget) => boolean
  isEditing: (target: InlineTarget) => boolean
  select: (target: InlineTarget) => void
  start: (target: InlineTarget) => void
  commit: (target: InlineTarget, value: string) => void
  cancel: () => void
  commitImage: (
    url: string,
    alt: string,
    target?: InlineTarget,
    altTarget?: InlineTarget
  ) => void
  replaceItems?: (items: ContentItem[]) => void
}

export function sameInlineTarget(left: InlineTarget, right: InlineTarget) {
  return (
    left.kind === right.kind &&
    (left.kind === "property"
      ? right.kind === "property" && left.key === right.key
      : left.kind === "item"
        ? right.kind === "item" &&
          left.id === right.id &&
          left.key === right.key
        : right.kind === "item-feature" &&
          left.id === right.id &&
          left.index === right.index)
  )
}

export function InlineText({
  editor,
  target,
  value,
  label,
  as = "span",
  multiline = false,
  className,
  focusable = true,
}: {
  editor?: InlineEditor
  target: InlineTarget
  value: string
  label: string
  as?: "span" | "p" | "h2" | "h3" | "strong"
  multiline?: boolean
  className?: string
  focusable?: boolean
}) {
  const editable = !!editor?.isEditable(target)
  const selected = editable && editor?.isSelected(target)
  const editing = editable && editor?.isEditing(target)
  const cancelOnBlur = useRef(false)
  const finish = (input: HTMLInputElement | HTMLTextAreaElement) => {
    editor?.commit(target, input.value)
  }

  if (editing && editor) {
    const EditorControl = multiline ? Textarea : Input
    return (
      <EditorControl
        aria-label={`Editar ${label}`}
        data-inline-editor-control=""
        autoFocus
        defaultValue={value}
        maxLength={20000}
        rows={multiline ? 3 : undefined}
        className={`pointer-events-auto -m-1 h-auto min-h-0 w-[calc(100%+0.5rem)] resize-y rounded-sm border-primary/50 bg-background/80 p-1 text-inherit shadow-none focus-visible:ring-2 ${className ?? ""}`}
        style={{
          fontSize: "inherit",
          fontWeight: "inherit",
          letterSpacing: "inherit",
          lineHeight: "inherit",
        }}
        onBlur={(event) => {
          if (cancelOnBlur.current) {
            cancelOnBlur.current = false
            return
          }
          finish(event.currentTarget)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            cancelOnBlur.current = true
            editor.cancel()
          } else if (
            event.key === "Enter" &&
            (!multiline || event.ctrlKey || event.metaKey)
          ) {
            event.preventDefault()
            event.stopPropagation()
            finish(event.currentTarget)
          }
        }}
      />
    )
  }

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (!editor || !editable) return
    event.preventDefault()
    event.stopPropagation()
    if (editor.isSelected(target)) editor.start(target)
    else editor.select(target)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" && editor && editable) {
      event.preventDefault()
      event.stopPropagation()
      editor.start(target)
    }
  }

  return createElement(
    as,
    {
      className: `${className ?? ""} ${editable ? "pointer-events-auto cursor-text rounded-[2px] outline outline-1 outline-transparent hover:outline-primary/50 focus-visible:outline-primary data-[inline-selected=true]:outline-primary data-[inline-selected=true]:outline-2" : ""}`,
      "data-inline-editable": editable ? "" : undefined,
      "data-inline-selected": selected ? "true" : undefined,
      tabIndex: editable && focusable ? 0 : undefined,
      "aria-description": editable
        ? `${label} editável. Pressione Enter para editar.`
        : undefined,
      onClick: handleClick,
      onDoubleClick: () => editable && editor?.start(target),
      onKeyDown: handleKeyDown,
      onContextMenu: () => {
        if (editable) {
          editor?.select(target)
        }
      },
    },
    value
  )
}

export function InlineImage({
  editor,
  url,
  alt,
  children,
  target = { kind: "property", key: "imageUrl" },
  altTarget,
  className,
}: {
  editor?: InlineEditor
  url: string
  alt: string
  children: ReactNode
  target?: InlineTarget
  altTarget?: InlineTarget
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [draftUrl, setDraftUrl] = useState(url)
  const [draftAlt, setDraftAlt] = useState(alt)
  if (!editor?.isEditable(target)) return children
  const selected = editor.isSelected(target)

  return (
    <div
      className={`group/inline-image relative rounded-xl ${selected ? "outline outline-2 outline-primary" : "hover:outline hover:outline-1 hover:outline-primary/50"} ${className ?? ""}`}
      data-inline-image=""
      style={{ pointerEvents: "auto" }}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        editor.select(target)
      }}
      onDoubleClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setOpen(true)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        editor.select(target)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          setOpen(true)
        }
      }}
      role="group"
      tabIndex={0}
      aria-label="Controles de edição da imagem"
    >
      {children}
      <Popover
        align="end"
        open={open}
        onOpenChange={(value) => {
          if (value) {
            setDraftUrl(url)
            setDraftAlt(alt)
          }
          setOpen(value)
        }}
      >
        <PopoverTrigger>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Editar propriedades da imagem"
            data-inline-editor-control=""
            className={`absolute top-2 right-2 z-10 opacity-0 group-hover/inline-image:opacity-100 focus-visible:opacity-100 ${selected ? "opacity-100" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <ImageIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="builder-ui glass-frosted w-72">
          <div
            data-inline-editor-control=""
            onClick={(event) => event.stopPropagation()}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="inline-image-url">
                  URL da imagem
                </FieldLabel>
                <Input
                  id="inline-image-url"
                  type="url"
                  value={draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                />
              </Field>
              {target.kind === "property" || altTarget ? (
                <Field>
                  <FieldLabel htmlFor="inline-image-alt">
                    Texto alternativo
                  </FieldLabel>
                  <Input
                    id="inline-image-alt"
                    value={draftAlt}
                    onChange={(event) => setDraftAlt(event.target.value)}
                  />
                </Field>
              ) : null}
              <Button
                type="button"
                data-inline-editor-control=""
                onClick={() => {
                  editor.commitImage(draftUrl, draftAlt, target, altTarget)
                  setOpen(false)
                }}
              >
                Aplicar alterações da imagem
              </Button>
            </FieldGroup>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
