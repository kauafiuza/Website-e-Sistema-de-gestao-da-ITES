import { Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

type IssueStatus = "Backlog" | "Planned" | "In Progress" | "Review" | "Done"
type IssuePriority = "low" | "medium" | "high" | null

const statusOrder: IssueStatus[] = [
  "Backlog",
  "Planned",
  "In Progress",
  "Review",
  "Done",
]

function getDisplayStatusLabel(status: IssueStatus) {
  return ({ Backlog: "Fila", Planned: "A fazer", "In Progress": "Em andamento", Review: "Em revisão", Done: "Concluída" })[status]
}

function isIssueStatus(value: string): value is IssueStatus {
  return statusOrder.some((status) => status === value)
}

function getPriority(value: string | undefined): IssuePriority {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : null
}

export function IssueListBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<IssueStatus | "all">("all")
  const issues = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return (p.items ?? [])
      .filter((issue) => {
        const issueStatus = isIssueStatus(issue.value) ? issue.value : "Backlog"
        return status === "all" || issueStatus === status
      })
      .filter((issue) => {
        if (!normalized) return true
        return [issue.href, issue.title, issue.value]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      })
      .sort((a, b) => {
        const aStatus = isIssueStatus(a.value) ? a.value : "Backlog"
        const bStatus = isIssueStatus(b.value) ? b.value : "Backlog"
        return statusOrder.indexOf(aStatus) - statusOrder.indexOf(bStatus)
      })
  }, [p.items, query, status])

  return (
    <section className="builder-block bg-background">
      <div className="mx-auto flex h-[calc(100svh-7rem)] max-h-[1000px] min-h-[600px] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border bg-background">
        <header className="flex min-h-14 flex-wrap items-center gap-3 border-b px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "title" }}
              value={p.title}
              label="título da lista de tarefas"
            />
          </h2>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {issues.length}
          </span>
          <div className="relative w-full @md:ml-auto @md:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Buscar tarefas"
              data-inline-editor-control=""
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tarefas"
              className="pointer-events-auto h-8 pl-8"
            />
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b px-4 py-2">
          {(["all", ...statusOrder] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={status === option ? "default" : "outline"}
              data-inline-editor-control=""
              className="pointer-events-auto h-7"
              onClick={() => setStatus(option)}
            >
              {option === "all" ? "Todos" : getDisplayStatusLabel(option)}
            </Button>
          ))}
        </div>
        <ul className="pointer-events-auto min-h-0 flex-1 divide-y overflow-auto">
          {issues.map((issue) => {
            const issueStatus = isIssueStatus(issue.value)
              ? issue.value
              : "Backlog"
            const priority = getPriority(issue.features[0])
            const assignee = issue.features[1] ?? ""
            const avatarUrl = safeImageUrl(issue.features[2] ?? "")

            return (
              <li
                key={issue.id}
                className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <InlineText
                    editor={editor}
                    target={{ kind: "item", id: issue.id, key: "href" }}
                    value={issue.href}
                    label="código da tarefa"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    <InlineText
                      editor={editor}
                      target={{ kind: "item", id: issue.id, key: "title" }}
                      value={issue.title}
                      label="título da tarefa"
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getDisplayStatusLabel(issueStatus)}
                    {priority ? ` · ${priority}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <InlineImage
                    editor={editor}
                    target={{ kind: "item-feature", id: issue.id, index: 2 }}
                    url={issue.features[2] ?? ""}
                    alt={assignee}
                    className="!rounded-full"
                  >
                    <Avatar className="size-6">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={assignee} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {assignee
                          .split(" ")
                          .filter(Boolean)
                          .map((part) => part[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  </InlineImage>
                  <span className="hidden text-xs text-muted-foreground @md:inline">
                    {assignee}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
