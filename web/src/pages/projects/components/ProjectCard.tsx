import { Link } from "react-router-dom"
import {
  ArrowUpRight,
  FilePenLine,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/motion/card"
import { Button } from "@/components/ui/button"
import { BlocksPreview } from "@/components/previews/BlocksPreview"
import {
  defaultProjectTheme,
  parseProjectTheme,
  themeVariables,
} from "@/pages/editor/lib/project-theme"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ProjectSummary } from "@/types/auth/project.types"
import { AnimatedBadge } from "@/components/motion/animated-badge"
import { formatProjectDate } from "../libs/project-list"

type Props = {
  project: ProjectSummary
  onRename: (project: ProjectSummary) => void
  onDelete: (project: ProjectSummary) => void
}

export function ProjectCard({ project, onRename, onDelete }: Props) {
  const projectTheme =
    parseProjectTheme(project.preview.theme) ?? defaultProjectTheme()

  return (
    <Card
      size="compact"
      className="min-w-0 gap-0 overflow-hidden border-border bg-card py-0 pb-4"
    >
      <CardContent className="relative px-0">
        <BlocksPreview
          blocks={project.preview.blocks}
          themeStyle={themeVariables(projectTheme)}
          className="h-40"
          emptyState={<FilePenLine className="size-10 stroke-[1.5]" />}
        />
        {project.publicationActive != null && (
          <AnimatedBadge
            size="sm"
            status={project.publicationActive ? "success" : "warning"}
            className="absolute top-3 left-3 bg-card/90"
          >
            {project.publicationActive ? "Publicado" : "Pausado"}
          </AnimatedBadge>
        )}
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  aria-label={`Ações para ${project.name}`}
                  className="size-8 border border-border bg-card/90"
                />
              }
            >
              <MoreVertical aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => onRename(project)}>
                  <Pencil aria-hidden="true" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(project)}
                >
                  <Trash2 aria-hidden="true" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
      <CardHeader className="gap-1 px-4 pt-4 pb-4">
        <CardTitle as="h2" className="min-w-0 text-pretty break-words">
          {project.name}
        </CardTitle>
        <CardDescription>
          Atualizado em{" "}
          <time dateTime={project.updatedAt}>
            {formatProjectDate(project.updatedAt)}
          </time>
        </CardDescription>
      </CardHeader>
      <CardFooter className="px-4">
        <Link
          to={`/editor/${project.id}`}
          aria-label={`Abrir ${project.name} no editor`}
          className="relative z-10 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-muted/50 px-3 text-sm font-medium text-primary transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          Abrir no editor <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}
