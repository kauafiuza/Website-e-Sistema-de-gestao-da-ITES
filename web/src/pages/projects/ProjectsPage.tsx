import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { useAuth } from "@/context/auth/auth.context"
import { AppHeader, MainLayout } from "@/layout/MainLayout"
import { PlatformBreadcrumb } from "@/layout/PlatformBreadcrumb"
import { AppSidebar } from "@/layout/PlatformSidebar"
import { WorkAreaPageHeader } from "@/layout/WorkAreaPageHeader"
import { initialDocument } from "@/pages/editor/lib/document"
import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
  ProjectError,
} from "@/services/projects/project.service"
import type { ProjectSummary } from "@/types/auth/project.types"
import { Button } from "@/components/ui/button"
import { useInfinitePage } from "@/hooks/use-infinite-page"
import { ProjectDialogs } from "./components/ProjectDialogs"
import { ProjectResults } from "./components/ProjectResults"
import { ProjectToolbar } from "./components/ProjectToolbar"
import { isProjectSort, type ProjectSort } from "./libs/project-list"

export default function ProjectsPage() {
  const { accessToken } = useAuth()
  const [mobileNavigation, setMobileNavigation] = useState(false)
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("builder-sidebar-collapsed") === "true"
  )
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => {
      setMobile(media.matches)
      setMobileNavigation(false)
    }
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  function toggleSidebar() {
    if (mobile) {
      setMobileNavigation((value) => !value)
      return
    }
    setSidebarCollapsed((value) => {
      localStorage.setItem("builder-sidebar-collapsed", String(!value))
      return !value
    })
  }
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get("q") ?? ""
  const sortParam = searchParams.get("sort")
  const sort: ProjectSort = isProjectSort(sortParam) ? sortParam : "recent"
  const projectPages = useInfinitePage<ProjectSummary>(10)
  const { loadFirst: loadFirstProjectPage, loadMore: loadMoreProjectPage } = projectPages
  const [searchQuery, setSearchQuery] = useState(query)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [retry, setRetry] = useState(0)
  const [mode, setMode] = useState<"create" | "rename" | null>(null)
  const [target, setTarget] = useState<ProjectSummary | null>(null)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(query), 250)
    return () => window.clearTimeout(timeout)
  }, [query])

  const loadProjects = useCallback(
    (page: number, size: number) => {
      if (!accessToken) return Promise.reject(new Error("Sessão indisponível"))
      return listProjects(accessToken, { page, size, q: searchQuery, sort })
    },
    [accessToken, searchQuery, sort],
  )

  useEffect(() => {
    if (!accessToken) return
    let active = true
    void loadFirstProjectPage(loadProjects)
      .then(() => {
        if (active) setError("")
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar seus projetos")
      })
    return () => {
      active = false
    }
  }, [accessToken, loadFirstProjectPage, loadProjects, retry])

  async function loadMoreProjects() {
    try {
      await loadMoreProjectPage(loadProjects)
    } catch {
      setError("Não foi possível carregar mais projetos")
    }
  }
  const projects = projectPages.items
  const shown = projects

  function updateSearch(key: "q" | "sort", value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (!value || (key === "sort" && value === "recent")) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true }
    )
  }

  function openCreate() {
    setTarget(null)
    setMode("create")
    setName("")
    setFormError("")
  }
  function openRename(project: ProjectSummary) {
    setTarget(project)
    setMode("rename")
    setName(project.name)
    setFormError("")
  }
  function openDelete(project: ProjectSummary) {
    setTarget(project)
    setMode(null)
    setFormError("")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = name.trim()
    if (!clean || clean.length > 150) {
      setFormError("Informe um nome de até 150 caracteres.")
      return
    }
    if (!accessToken || busy) return
    setBusy(true)
    setFormError("")
    try {
      if (mode === "create") {
        const project = await createProject(accessToken, {
          ...initialDocument(),
          name: clean,
        })
        navigate(`/editor/${project.id}`)
      } else if (target) {
        await renameProject(
          accessToken,
          target.id,
          target.revision,
          clean
        )
        await loadFirstProjectPage(loadProjects)
        setMode(null)
        setTarget(null)
        setNotice("Projeto renomeado.")
      }
    } catch (reason) {
      setFormError(
        reason instanceof ProjectError
          ? reason.message
          : "Não foi possível salvar o projeto. Tente novamente."
      )
      if (reason instanceof ProjectError && reason.status === 409)
        setRetry((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!target || !accessToken || busy) return
    setBusy(true)
    setFormError("")
    try {
      await deleteProject(accessToken, target.id)
      await loadFirstProjectPage(loadProjects)
      setTarget(null)
      setNotice("Projeto excluído.")
    } catch (reason) {
      setFormError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir o projeto. Tente novamente."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <MainLayout
      sidebar={
        <AppSidebar
          collapsed={sidebarCollapsed}
          onClose={() => setMobileNavigation(false)}
        />
      }
      mobileSidebar={<AppSidebar onClose={() => setMobileNavigation(false)} />}
      header={
        <AppHeader
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          showPlatformThemeToggle
          className="px-3!"
        >
          <PlatformBreadcrumb current="Meus projetos" />
        </AppHeader>
      }
      mobileOpen={mobileNavigation}
      onMobileOpenChange={setMobileNavigation}
      sidebarLabel="Navegação principal"
      contentClassName="overflow-y-auto"
      contentId="projects-scroll-container"
    >
      <a
        href="#projects-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:p-3 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ir para o conteúdo
      </a>
      <main
        id="projects-main"
        className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10"
      >
        <WorkAreaPageHeader
          title="Meus projetos"
          description="Continue de onde parou ou comece uma nova ideia."
          action={(
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden="true" /> Novo projeto
            </Button>
          )}
        />
        <ProjectToolbar
          query={query}
          sort={sort}
          count={projectPages.totalElements}
          onQueryChange={(value) => updateSearch("q", value)}
          onSortChange={(value) => updateSearch("sort", value)}
        />
        {notice ? (
          <p role="status" className="mt-4 text-sm">
            {notice}
          </p>
        ) : null}
        <ProjectResults
          projects={shown}
          total={projectPages.totalElements}
          isSearch={Boolean(query.trim())}
          hasMore={projectPages.hasMore}
          loadingMore={projectPages.loadingMore}
          onLoadMore={() => void loadMoreProjects()}
          loading={projectPages.loading}
          error={error}
          onRetry={() => {
            setRetry((value) => value + 1)
          }}
          onCreate={openCreate}
          onClearSearch={() => updateSearch("q", "")}
          onRename={openRename}
          onDelete={openDelete}
        />
      </main>
      <ProjectDialogs
        mode={mode}
        target={target}
        name={name}
        busy={busy}
        error={formError}
        onNameChange={setName}
        onSubmit={submit}
        onDelete={() => void remove()}
        onCloseForm={() => {
          setMode(null)
          setTarget(null)
        }}
        onCloseDelete={() => setTarget(null)}
      />
    </MainLayout>
  )
}
