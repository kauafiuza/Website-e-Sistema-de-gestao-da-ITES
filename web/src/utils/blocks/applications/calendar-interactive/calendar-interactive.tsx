import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useId, useMemo, useState, type DragEvent, type FormEvent } from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

type CalendarId = "work" | "meetings" | "social" | "personal" | "important"
type CalendarView = "month" | "week"

type CalendarEvent = {
  id: string
  title: string
  description?: string
  date: string
  start?: string
  end?: string
  calendar: CalendarId
}

type Draft = {
  id?: string
  title: string
  description: string
  date: string
  start: string
  end: string
  calendar: CalendarId
}

const TODAY = new Date(2026, 9, 21)
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

const CALENDARS: Record<
  CalendarId,
  { label: string; dot: string; chip: string }
> = {
  work: {
    label: "Trabalho",
    dot: "bg-chart-1",
    chip: "bg-chart-1/15 hover:bg-chart-1/25",
  },
  meetings: {
    label: "Reuniões",
    dot: "bg-chart-2",
    chip: "bg-chart-2/15 hover:bg-chart-2/25",
  },
  social: {
    label: "Social",
    dot: "bg-chart-3",
    chip: "bg-chart-3/15 hover:bg-chart-3/25",
  },
  personal: {
    label: "Pessoal",
    dot: "bg-chart-4",
    chip: "bg-chart-4/15 hover:bg-chart-4/25",
  },
  important: {
    label: "Importante",
    dot: "bg-chart-5",
    chip: "bg-chart-5/15 hover:bg-chart-5/25",
  },
}

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
})
const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
})
const longDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  month: "long",
  day: "numeric",
})

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7))
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    toIsoDate(parseIsoDate(value)) === value
  )
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  const suffix = hour >= 12 ? "pm" : "am"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0
    ? `${displayHour}${suffix}`
    : `${displayHour}:${String(minute).padStart(2, "0")}${suffix}`
}

function buildMonthDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const start = startOfWeek(first)
  const cells = Math.ceil((((first.getDay() + 6) % 7) + last.getDate()) / 7) * 7
  return Array.from({ length: cells }, (_, index) => addDays(start, index))
}

function formatWeekRange(anchor: Date) {
  const start = startOfWeek(anchor)
  const end = addDays(start, 6)
  const endLabel =
    start.getMonth() === end.getMonth()
      ? String(end.getDate())
      : `${shortMonthFormatter.format(end)} ${end.getDate()}`
  return `${shortMonthFormatter.format(start)} ${start.getDate()} – ${endLabel}, ${end.getFullYear()}`
}

function sortEvents(a: CalendarEvent, b: CalendarEvent) {
  return (a.start ?? "").localeCompare(b.start ?? "")
}

function fromItems(items: ContentItem[]): CalendarEvent[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || undefined,
    date: validDate(item.href) ? item.href : toIsoDate(TODAY),
    start: validTime(item.features[0] ?? "") ? item.features[0] : undefined,
    end: validTime(item.features[1] ?? "") ? item.features[1] : undefined,
    calendar: item.value in CALENDARS ? (item.value as CalendarId) : "work",
  }))
}

function toItems(events: CalendarEvent[]): ContentItem[] {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    href: event.date,
    value: event.calendar,
    features: event.start && event.end ? [event.start, event.end] : [],
  }))
}

export function CalendarInteractiveBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const formId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const dateId = useId()
  const startId = useId()
  const endId = useId()
  const sourceEvents = useMemo(() => fromItems(p.items ?? []), [p.items])
  const [localEvents, setLocalEvents] = useState(() => ({
    source: p.items,
    events: sourceEvents,
  }))
  const events =
    localEvents.source === p.items ? localEvents.events : sourceEvents
  const [view, setView] = useState<CalendarView>("month")
  const [anchor, setAnchor] = useState(TODAY)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropDate, setDropDate] = useState<string | null>(null)

  const saveEvents = (next: CalendarEvent[]) => {
    setLocalEvents({ source: p.items, events: next })
    editor?.replaceItems?.(toItems(next))
  }

  const days = useMemo(
    () =>
      view === "month"
        ? buildMonthDays(anchor)
        : Array.from({ length: 7 }, (_, index) =>
            addDays(startOfWeek(anchor), index)
          ),
    [anchor, view]
  )
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach((event) => {
      map.set(event.date, [...(map.get(event.date) ?? []), event])
    })
    map.forEach((list) => list.sort(sortEvents))
    return map
  }, [events])

  const isEditing = Boolean(draft?.id)
  const isAllDay = Boolean(draft && !draft.start && !draft.end)
  const hasTimeError = Boolean(
    draft &&
    !isAllDay &&
    (!draft.start || !draft.end || draft.end <= draft.start)
  )

  const step = (direction: number) =>
    setAnchor((current) =>
      view === "month"
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : addDays(current, direction * 7)
    )

  const openNewEvent = (date: string) => {
    if (events.length >= 50) return
    setDraft({
      title: "",
      description: "",
      date,
      start: "09:00",
      end: "10:00",
      calendar: "work",
    })
  }

  const openEvent = (event: CalendarEvent) =>
    setDraft({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      date: event.date,
      start: event.start ?? "",
      end: event.end ?? "",
      calendar: event.calendar,
    })

  const updateDraft = (patch: Partial<Draft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current))

  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault()
    if (!draft || !draft.title.trim() || !validDate(draft.date) || hasTimeError)
      return
    const saved: CalendarEvent = {
      id: draft.id ?? crypto.randomUUID(),
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      date: draft.date,
      start: isAllDay ? undefined : draft.start,
      end: isAllDay ? undefined : draft.end,
      calendar: draft.calendar,
    }
    saveEvents(
      draft.id
        ? events.map((item) => (item.id === draft.id ? saved : item))
        : [...events, saved]
    )
    setDraft(null)
  }

  const handleDelete = () => {
    if (!draft?.id) return
    saveEvents(events.filter((item) => item.id !== draft.id))
    setDraft(null)
  }

  const handleDrop = (dragEvent: DragEvent<HTMLDivElement>, date: string) => {
    dragEvent.preventDefault()
    if (draggingId) {
      saveEvents(
        events.map((item) =>
          item.id === draggingId ? { ...item, date } : item
        )
      )
    }
    setDraggingId(null)
    setDropDate(null)
  }

  return (
    <section className="builder-block bg-background text-foreground">
      <div className="mx-auto flex h-[calc(100svh-7rem)] max-h-[1200px] min-h-[600px] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border bg-background">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3 @md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-lg font-semibold">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título do calendário"
              />{" "}
              -{" "}
              {view === "month"
                ? monthFormatter.format(anchor)
                : formatWeekRange(anchor)}
            </h2>
            <div className="flex shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                className="pointer-events-auto"
                data-inline-editor-control=""
                aria-label={
                  view === "month" ? "Mês anterior" : "Semana anterior"
                }
                onClick={() => step(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="pointer-events-auto"
                data-inline-editor-control=""
                aria-label={view === "month" ? "Próximo mês" : "Próxima semana"}
                onClick={() => step(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {(["month", "week"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                data-inline-editor-control=""
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className="pointer-events-auto rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground capitalize transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
              >
                {mode}
              </button>
            ))}
          </div>
        </header>

        <div className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="sticky top-0 z-10 grid min-w-[520px] grid-cols-7 border-b bg-muted/40 backdrop-blur">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="flex h-10 items-center justify-end border-r px-2 text-xs font-medium text-muted-foreground last:border-r-0 @2xl:px-3"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div
            className="grid min-w-[520px] flex-1 grid-cols-7"
            style={{
              gridTemplateRows: `repeat(${days.length / 7}, minmax(${view === "month" ? "7.5rem" : "0"}, 1fr))`,
            }}
          >
            {days.map((date) => {
              const iso = toIsoDate(date)
              const dayEvents = eventsByDay.get(iso) ?? []
              const isOutside =
                view === "month" && date.getMonth() !== anchor.getMonth()
              const isToday = iso === toIsoDate(TODAY)
              return (
                <div
                  key={iso}
                  data-inline-editor-control=""
                  onClick={(clickEvent) => {
                    if ((clickEvent.target as HTMLElement).closest("button"))
                      return
                    openNewEvent(iso)
                  }}
                  onDragOver={(dragEvent) => {
                    if (!draggingId) return
                    dragEvent.preventDefault()
                    setDropDate(iso)
                  }}
                  onDrop={(dragEvent) => handleDrop(dragEvent, iso)}
                  className={cn(
                    "group flex min-h-0 cursor-pointer flex-col gap-1 border-r border-b px-2 py-2 transition-colors hover:bg-muted/30 @2xl:px-3 [&:nth-child(7n)]:border-r-0",
                    isOutside && "bg-muted/30",
                    dropDate === iso && "bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-end gap-1.5 text-xs font-medium">
                    {date.getDate() === 1 ? (
                      <span className="text-muted-foreground">
                        {shortMonthFormatter.format(date)}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full",
                        isOutside && "text-muted-foreground",
                        isToday &&
                          "bg-primary font-semibold text-primary-foreground"
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        draggable
                        onDragStart={(dragEvent) => {
                          dragEvent.dataTransfer.effectAllowed = "move"
                          dragEvent.dataTransfer.setData("text/plain", event.id)
                          setDraggingId(event.id)
                        }}
                        onDragEnd={() => {
                          setDraggingId(null)
                          setDropDate(null)
                        }}
                        onClick={() => openEvent(event)}
                        title={event.title}
                        className={cn(
                          "flex h-7 w-full shrink-0 items-center gap-2 rounded-md px-2 text-left text-xs font-medium transition-colors",
                          CALENDARS[event.calendar].chip,
                          draggingId === event.id && "opacity-40"
                        )}
                      >
                        <span
                          className={cn(
                            "h-4 w-0.5 shrink-0 rounded-full",
                            CALENDARS[event.calendar].dot
                          )}
                        />
                        <span className="min-w-0 truncate">
                          {event.start ? (
                            <span className="mr-1.5 text-muted-foreground">
                              {formatTime(event.start)}
                            </span>
                          ) : null}
                          {event.title}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => openNewEvent(iso)}
                    className="mt-auto flex h-6 items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                  >
                    <Plus className="size-3.5" />
                    Add event
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Sheet
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      >
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{isEditing ? "Editar evento" : "Novo evento"}</SheetTitle>
            <SheetDescription>
              {draft
                ? validDate(draft.date)
                  ? longDayFormatter.format(parseIsoDate(draft.date))
                  : "Escolha uma data válida."
                : "Adicione um evento ao calendário."}
            </SheetDescription>
          </SheetHeader>

          {draft ? (
            <form
              id={formId}
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-6"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={titleId}>Título</FieldLabel>
                  <Input
                    id={titleId}
                    value={draft.title}
                    onChange={(event) =>
                      updateDraft({ title: event.target.value })
                    }
                    placeholder="Reunião de planejamento"
                    required
                    maxLength={20000}
                    autoFocus
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={descriptionId}>Observações</FieldLabel>
                  <Textarea
                    id={descriptionId}
                    value={draft.description}
                    onChange={(event) =>
                      updateDraft({ description: event.target.value })
                    }
                    placeholder="Pauta, links ou outras informações importantes"
                    rows={3}
                    maxLength={20000}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={dateId}>Data</FieldLabel>
                  <Input
                    id={dateId}
                    type="date"
                    value={draft.date}
                    onChange={(event) =>
                      updateDraft({ date: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field data-invalid={hasTimeError || undefined}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <FieldLabel htmlFor={startId}>Início</FieldLabel>
                      <Input
                        id={startId}
                        type="time"
                        value={draft.start}
                        onChange={(event) =>
                          updateDraft({ start: event.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <FieldLabel htmlFor={endId}>Término</FieldLabel>
                      <Input
                        id={endId}
                        type="time"
                        value={draft.end}
                        onChange={(event) =>
                          updateDraft({ end: event.target.value })
                        }
                        aria-invalid={hasTimeError || undefined}
                      />
                    </div>
                  </div>
                  <FieldDescription>
                    {hasTimeError
                      ? "O horário de término deve ser posterior ao horário de início."
                      : "Limpe os dois horários para criar um evento de dia inteiro."}
                  </FieldDescription>
                </Field>
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium">Calendário</span>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(CALENDARS) as CalendarId[]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={draft.calendar === id}
                        onClick={() => updateDraft({ calendar: id })}
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors aria-pressed:border-foreground aria-pressed:text-foreground"
                      >
                        <span
                          className={cn(
                            "size-2.5 rounded-full",
                            CALENDARS[id].dot
                          )}
                        />
                        {CALENDARS[id].label}
                      </button>
                    ))}
                  </div>
                </div>
              </FieldGroup>
            </form>
          ) : null}

          <SheetFooter className="flex-row justify-between gap-2">
            {isEditing ? (
              <Button type="button" variant="ghost" onClick={handleDelete}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft(null)}
              >
                Cancel
              </Button>
              <Button type="submit" form={formId}>
                {isEditing ? "Salvar" : "Adicionar evento"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  )
}
