import { FolderOpen, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import type { ProjectSummary } from "@/types/auth/project.types"
import { ProjectCard } from "./ProjectCard"
import InfiniteScroll from "react-infinite-scroll-component"

type Props = {
  projects: ProjectSummary[]
  total: number
  isSearch: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  loading: boolean
  error: string
  onRetry: () => void
  onCreate: () => void
  onClearSearch: () => void
  onRename: (project: ProjectSummary) => void
  onDelete: (project: ProjectSummary) => void
}

export function ProjectResults({
  projects,
  total,
  isSearch,
  hasMore,
  loadingMore,
  onLoadMore,
  loading,
  error,
  onRetry,
  onCreate,
  onClearSearch,
  onRename,
  onDelete,
}: Props) {
  if (loading && projects.length === 0) {
    return (
      <PageLoader
        layout="content"
        label="Carregando projetos"
        className="mt-6 min-h-72"
      />
    )
  }

  if (error && projects.length === 0) {
    return (
      <Empty role="alert" className="mt-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            <h2>{error}</h2>
          </EmptyTitle>
          <EmptyDescription>
            Verifique sua conexão e tente novamente.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRetry}>Tentar novamente</Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (total === 0 && !isSearch) {
    return (
      <Empty className="mt-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            <h2>Seu espaço de criação começa aqui</h2>
          </EmptyTitle>
          <EmptyDescription>
            Crie um projeto para começar a organizar as páginas institucionais da ITES.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreate}>Criar primeiro projeto</Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (projects.length === 0) {
    return (
      <Empty className="mt-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            <h2>Nenhum projeto encontrado</h2>
          </EmptyTitle>
          <EmptyDescription>
            Tente outro nome ou limpe a pesquisa para ver todos os projetos.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearSearch}>
            Limpar pesquisa
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <section aria-busy={loading}>
      {loading ? (
        <p role="status" className="mt-6 text-sm text-muted-foreground">
          Atualizando projetos…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
      <InfiniteScroll
        dataLength={projects.length}
        next={onLoadMore}
        hasMore={hasMore}
        loader={loadingMore ? <p className="py-6 text-center text-sm text-muted-foreground">Carregando mais projetos…</p> : null}
        endMessage={<p className="py-6 text-center text-xs text-muted-foreground">Você chegou ao fim da lista.</p>}
        scrollableTarget="projects-scroll-container"
        className="mt-6!"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onRename={onRename} onDelete={onDelete} />
          ))}
        </div>
      </InfiniteScroll>
    </section>
  )
}
