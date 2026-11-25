import type { ProjectSummary } from "@/types/auth/project.types"

export type ProjectSort = "recent" | "old" | "name"

export function isProjectSort(value: string | null): value is ProjectSort {
  return value === "recent" || value === "old" || value === "name"
}

export function filterProjects(
  projects: ProjectSummary[],
  query: string,
  sort: ProjectSort
) {
  const search = query.trim().toLocaleLowerCase("pt-BR")
  return projects
    .filter((project) =>
      project.name.toLocaleLowerCase("pt-BR").includes(search)
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR")
      const difference = Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
      return sort === "old" ? difference : -difference
    })
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function formatProjectDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : dateFormatter.format(date)
}
