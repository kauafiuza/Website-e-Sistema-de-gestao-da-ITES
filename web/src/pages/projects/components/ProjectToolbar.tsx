import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select"
import type { ProjectSort } from "../libs/project-list"

type Props = {
  query: string
  sort: ProjectSort
  count: number
  onQueryChange: (value: string) => void
  onSortChange: (value: ProjectSort) => void
}

export function ProjectToolbar({
  query,
  sort,
  count,
  onQueryChange,
  onSortChange,
}: Props) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="project-search"
          type="search"
          aria-label="Pesquisar projetos pelo nome"
          autoComplete="off"
          placeholder="Pesquisar projetos…"
          className="border-border bg-muted/50 pr-10 pl-9"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Limpar pesquisa"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => onQueryChange("")}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <Select
        value={sort}
        onValueChange={(value) => onSortChange(value as ProjectSort)}
        className="sm:w-56"
      >
        <SelectTrigger
          aria-label="Ordenar projetos"
          className="h-9 border-border bg-muted/50"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Atualizados recentemente</SelectItem>
          <SelectItem value="old">Mais antigos</SelectItem>
          <SelectItem value="name">Nome A–Z</SelectItem>
        </SelectContent>
      </Select>
      <span
        role="status"
        className="shrink-0 text-sm text-muted-foreground tabular-nums"
      >
        {count} {count === 1 ? "resultado" : "resultados"}
      </span>
    </div>
  )
}
