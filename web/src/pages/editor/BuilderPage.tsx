import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/motion/input"
import { CenterMorphModal, CenterMorphModalContent } from "@/components/motion/center-morph-modal"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type DragEndEvent,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { MainLayout } from "@/layout/MainLayout"
import { AppSidebar } from "@/layout/PlatformSidebar"
import { useSearchParams } from "react-router-dom"
import { TooltipProvider } from "@/components/motion/tooltip"
import { BuilderDialogs } from "./components/BuilderDialogs"
import { Catalog } from "./components/Catalog"
import { Outline } from "./components/Outline"
import { Canvas, ProjectNavbarEditor } from "./components/Canvas"
import { PageContent, resolveNavbarProps } from "./components/PageContent"
import { BuilderHeader } from "./components/BuilderHeader"
import { ThemeEditorPanel } from "@/pages/themes/components/ThemeEditorPanel"
import { ThemeDeleteDialog } from "@/pages/themes/components/ThemeDeleteDialog"
import { ThemeRenameDialog } from "@/pages/themes/components/ThemeRenameDialog"
import {
  createTheme,
  deleteTheme,
  listThemes,
  updateTheme as updateSavedTheme,
  type SavedTheme,
} from "@/services/projects/theme.service"
import { defaultProjectTheme, themePresets, themeVariables, type ColorKey, type ProjectTheme } from "./lib/project-theme"
import { savedThemeDraft, updateThemeColor } from "@/pages/themes/lib/theme-lab"
import { uid } from "./lib/document"
import { useBuilder } from "./lib/use-builder"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import { definitions } from "@/utils/blocks"
import type { BlockProps } from "@/utils/blocks/types"
import type { InlineTarget } from "@/utils/blocks/shared/inline-editing"
const collision: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) {
    const containerId = args.active.data.current?.sortable?.containerId
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.sortable?.containerId === containerId
      ),
    })
  }
  return pointerWithin(args)
}
function keyboardCoordinates(
  event: Parameters<KeyboardCoordinateGetter>[0],
  options: Parameters<KeyboardCoordinateGetter>[1],
  previousTarget: string | number | null,
  setTarget: (id: string | number) => void
) {
  const { droppableRects, collisionRect } = options.context
  const sortable = options.context.draggableNodes.get(options.active)?.data
    .current?.sortable
  if (!sortable) return sortableKeyboardCoordinates(event, options)
  if (!["ArrowUp", "ArrowDown"].includes(event.code)) return undefined
  event.preventDefault()
  const items: (string | number)[] = sortable.items
  const index = items.indexOf(
    previousTarget !== null && items.includes(previousTarget)
      ? previousTarget
      : options.active
  )
  const target = items[index + (event.code === "ArrowUp" ? -1 : 1)]
  if (target === undefined) return undefined
  setTarget(target)
  const rect = droppableRects.get(target)
  if (!rect || !collisionRect) return options.currentCoordinates
  return {
    x: options.currentCoordinates.x + rect.left - collisionRect.left,
    y: options.currentCoordinates.y + rect.top - collisionRect.top,
  }
}
export default function BuilderPage() {
  const {
    document,
    dispatch,
    adoptTemplateRegions,
    accessToken,
    saveError,
    saveStatus,
    project,
    loading,
    loadFailed,
    conflict,
    loadServerVersion,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBuilder()
  const page = document.pages.find((p) => p.id === document.activePageId)!
  const [preview, setPreview] = useState(false)
  const [viewport, setViewport] = useState("desktop")
  const simulatedWidth = viewport === "mobile" ? 390 : null
  const canvasMaxWidth = simulatedWidth ?? (preview ? 1120 : 1440)
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  const [sidebar, setSidebar] = useState(() => window.innerWidth >= 768)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("builder-sidebar-collapsed") === "true"
  )
  const toggleSidebar = () => {
    if (mobile) {
      setSidebar((value) => !value)
      return
    }
    setSidebarCollapsed((value) => {
      localStorage.setItem("builder-sidebar-collapsed", String(!value))
      return !value
    })
  }
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [notice, setNotice] = useState("")
  const [themeLabOpen, setThemeLabOpen] = useState(false)
  const appliedTheme = document.theme ?? defaultProjectTheme()
  const [themeDraft, setThemeDraft] = useState<ProjectTheme>(appliedTheme)
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([])
  const [savedThemePage, setSavedThemePage] = useState(0)
  const [savedThemeHasMore, setSavedThemeHasMore] = useState(false)
  const [savedThemeLoadingMore, setSavedThemeLoadingMore] = useState(false)
  const savedThemeLoadInFlight = useRef(false)
  const [themeLoading, setThemeLoading] = useState(false)
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeError, setThemeError] = useState("")
  const [themeDeleteTarget, setThemeDeleteTarget] = useState<SavedTheme | null>(null)
  const [themeRenameTarget, setThemeRenameTarget] = useState<SavedTheme | null>(null)
  const [examplePromptOpen, setExamplePromptOpen] = useState(false)
  const [exampleThemeName, setExampleThemeName] = useState("")
  const [exampleThemeError, setExampleThemeError] = useState("")
  const [exampleDecision, setExampleDecision] = useState<"unset" | "manual" | "automatic">("unset")
  const pendingThemeChange = useRef<((theme: ProjectTheme) => ProjectTheme) | null>(null)
  const projectThemeStyle = themeVariables(themeLabOpen ? themeDraft : appliedTheme)
  const openThemeLab = () => {
    setThemeDraft(structuredClone(appliedTheme))
    setThemeLoading(true)
    setThemeLabOpen(true)
  }
  useEffect(() => {
    if (!themeLabOpen || !accessToken) return
    let active = true
    void listThemes(accessToken, 0, 20)
      .then((response) => {
        if (active) {
          setSavedThemes(response.items)
          setSavedThemePage(response.page)
          setSavedThemeHasMore(response.hasNext)
        }
      })
      .catch(() => {
        if (active) setNotice("Não foi possível carregar seus temas")
      })
      .finally(() => { if (active) setThemeLoading(false) })
    return () => {
      active = false
    }
  }, [themeLabOpen, accessToken])
  async function loadMoreSavedThemes() {
    if (!accessToken || !savedThemeHasMore || savedThemeLoadInFlight.current) return
    savedThemeLoadInFlight.current = true
    setSavedThemeLoadingMore(true)
    try {
      const response = await listThemes(accessToken, savedThemePage + 1, 20)
      setSavedThemes((current) => {
        const known = new Set(current.map((theme) => theme.id))
        return [...current, ...response.items.filter((theme) => !known.has(theme.id))]
      })
      setSavedThemePage(response.page)
      setSavedThemeHasMore(response.hasNext)
    } catch {
      setNotice("Não foi possível carregar mais temas")
    } finally {
      savedThemeLoadInFlight.current = false
      setSavedThemeLoadingMore(false)
    }
  }
  const commitTheme = (next: ProjectTheme) => {
    setThemeDraft(next)
    dispatch({ type: "project-theme", theme: next })
  }
  const isExampleTheme = (theme: ProjectTheme) =>
    !theme.presetId && Object.hasOwn(themePresets, theme.preset)
  const applyThemeChange = (change: (theme: ProjectTheme) => ProjectTheme) => {
    const current = themeDraft
    if (isExampleTheme(current) && exampleDecision === "unset") {
      pendingThemeChange.current = change
      setExampleThemeName(`${current.preset} personalizado`)
      setExampleThemeError("")
      setExamplePromptOpen(true)
      return
    }
    commitTheme(change(current))
  }
  const handleExampleEdit = async (saveAsTheme: boolean) => {
    const change = pendingThemeChange.current
    pendingThemeChange.current = null
    setExamplePromptOpen(false)
    if (!change) return
    const next = change(themeDraft)
    setExampleDecision(saveAsTheme ? "automatic" : "manual")
    if (saveAsTheme) {
      const name = exampleThemeName.trim()
      if (!name) {
        setExampleThemeError("Informe um nome para o tema.")
        pendingThemeChange.current = change
        setExamplePromptOpen(true)
        return
      }
      if (!accessToken) {
        setExampleThemeError("Entre na sua conta para salvar temas reutilizáveis.")
        pendingThemeChange.current = change
        setExamplePromptOpen(true)
        return
      }
      setThemeSaving(true)
      try {
        const created = await createTheme(accessToken, name, next)
        const saved = savedThemeDraft(created)
        setSavedThemes((current) => [created, ...current])
        commitTheme(saved)
        setThemeError("")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível salvar o tema."
        setThemeError(message)
        setNotice(message)
        commitTheme(next)
      } finally {
        setThemeSaving(false)
      }
      return
    }
    commitTheme(next)
  }
  useEffect(() => {
    if (!accessToken || !themeDraft.presetId) return
    const selected = savedThemes.find((item) => item.id === themeDraft.presetId)
    if (!selected || JSON.stringify(selected.configuration) === JSON.stringify({ ...themeDraft, presetId: undefined })) return
    const timer = window.setTimeout(() => {
      setThemeSaving(true)
      void updateSavedTheme(accessToken, {
        ...selected,
        configuration: themeDraft,
      }).then((updated) => {
        setSavedThemes((current) => current.map((item) => item.id === updated.id ? updated : item))
        setThemeError("")
      }).catch((error) => {
        const message = error instanceof Error ? error.message : "Não foi possível salvar o tema."
        setThemeError(message)
        setNotice(message)
      }).finally(() => setThemeSaving(false))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [accessToken, savedThemes, themeDraft])
  const [dragging, setDragging] = useState(false)
  const [dragLabel, setDragLabel] = useState("")
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inlineSelection, setInlineSelection] = useState<{
    blockId: string
    target: InlineTarget
  } | null>(null)
  const [inlineEditing, setInlineEditing] = useState<{
    blockId: string
    target: InlineTarget
  } | null>(null)
  const selectInline = useCallback(
    (blockId: string, target: InlineTarget) =>
      setInlineSelection({ blockId, target }),
    [setInlineSelection]
  )
  const startInline = useCallback(
    (blockId: string, target: InlineTarget) => {
      setInlineSelection({ blockId, target })
      setInlineEditing({ blockId, target })
    },
    [setInlineSelection, setInlineEditing]
  )
  const cancelInline = useCallback(
    () => setInlineEditing(null),
    [setInlineEditing]
  )
  const [editId, setEditId] = useState<string | null>(null)
  const editBlock = useCallback(
    (id: string) => {
      setSelectedId(id)
      setEditId(id)
    },
    [setSelectedId, setEditId]
  )
  const [renameId, setRenameId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [confirm, setConfirm] = useState<{
    type: "clear" | "delete"
    id?: string
  } | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const catalogTab =
    searchParams.get("catalog") === "pages" ? "pages" : "blocks"
  const setCatalogTab = useCallback(
    (value: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (value === "pages") next.set("catalog", "pages")
          else next.delete("catalog")
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = page.blocks.find((b) => b.id === editId) ?? (document.navbar?.id === editId ? document.navbar : document.footer?.id === editId ? document.footer : undefined)
  const commitInline = useCallback(
    (blockId: string, target: InlineTarget, value: string) => {
      const block = page.blocks.find((entry) => entry.id === blockId) ?? (document.navbar?.id === blockId ? document.navbar : document.footer?.id === blockId ? document.footer : undefined)
      if (!block) {
        setInlineEditing(null)
        return
      }
      if (target.kind === "property") {
        const current = block.props[target.key]
        if (current !== value) {
          const props: Partial<BlockProps> = {}
          switch (target.key) {
            case "title":
              props.title = value
              break
            case "description":
              props.description = value
              break
            case "button":
              props.button = value
              break
            case "href":
              props.href = value
              break
            case "eyebrow":
              props.eyebrow = value
              break
            case "imageUrl":
              props.imageUrl = value
              break
            case "imageAlt":
              props.imageAlt = value
              break
          }
          dispatch({ type: "update", id: blockId, props })
        }
      } else if (target.kind === "item") {
        const items = block.props.items ?? []
        const item = items.find((entry) => entry.id === target.id)
        if (item && item[target.key] !== value) {
          dispatch({
            type: "update",
            id: blockId,
            props: {
              items: items.map((entry) =>
                entry.id === target.id
                  ? { ...entry, [target.key]: value }
                  : entry
              ),
            },
          })
        }
      } else {
        const items = block.props.items ?? []
        const item = items.find((entry) => entry.id === target.id)
        if (item && item.features[target.index] !== value) {
          dispatch({
            type: "update",
            id: blockId,
            props: {
              items: items.map((entry) => {
                if (entry.id !== target.id) return entry
                const features = [...entry.features]
                features[target.index] = value
                return { ...entry, features }
              }),
            },
          })
        }
      }
      setInlineEditing(null)
    },
    [dispatch, document.navbar, document.footer, page.blocks, setInlineEditing]
  )
  const keyboardTarget = useRef<string | number | null>(null)
  const coordinateGetter = useCallback<KeyboardCoordinateGetter>(
    (event, options) =>
      keyboardCoordinates(event, options, keyboardTarget.current, (id) => {
        keyboardTarget.current = id
      }),
    []
  )
  const detectCollision = useCallback<CollisionDetection>((args) => {
    if (!args.pointerCoordinates && keyboardTarget.current !== null) {
      const target = args.droppableContainers.find(
        (c) => c.id === keyboardTarget.current
      )
      if (target)
        return [
          { id: target.id, data: { droppableContainer: target, value: 0 } },
        ]
    }
    return collision(args)
  }, [])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter })
  )
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const resize = () => {
      setMobile(media.matches)
      setSidebar(!media.matches)
    }
    media.addEventListener("change", resize)
    return () => media.removeEventListener("change", resize)
  }, [])
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSidebarCollapsed(false)
        localStorage.setItem("builder-sidebar-collapsed", "false")
        setSidebar(true)
        setCatalogTab("blocks")
        requestAnimationFrame(() => searchRef.current?.focus())
      }
      const target = e.target
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !(
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            ["INPUT", "TEXTAREA"].includes(target.tagName))
        )
      ) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if (
        e.key === "Escape" &&
        !e.defaultPrevented &&
        !(
          target instanceof HTMLElement &&
          target.closest('[role="dialog"], [role="menu"]')
        )
      )
        setPreview(false)
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [undo, redo, setCatalogTab])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(""), 3500)
    return () => clearTimeout(timer)
  }, [notice])
  function endDrag(e: DragEndEvent) {
    setDragging(false)
    if (keyboardTarget.current !== null) {
      const target = String(keyboardTarget.current).replace(/^outline:/, "")
      const index = page.blocks.findIndex((block) => block.id === target)
      keyboardTarget.current = null
      if (index >= 0)
        dispatch({
          type: "move",
          id: String(e.active.data.current?.instanceId ?? e.active.id),
          index,
        })
      return
    }
    if (!e.over) return
    const definitionId = e.active.data.current?.definitionId
    const targetIndex = e.over.data.current?.index
    const overIndex = page.blocks.findIndex((b) => b.id === e.over?.id)
    const index =
      typeof e.over.data.current?.instanceIndex === "number"
        ? e.over.data.current.instanceIndex
        : typeof targetIndex === "number"
          ? targetIndex
          : overIndex
    if (index < 0) return
    if (typeof definitionId === "string")
      dispatch({ type: "add", id: uid(), definitionId, index })
    else {
      const id =
        typeof e.active.data.current?.instanceId === "string"
          ? e.active.data.current.instanceId
          : String(e.active.id)
      if (typeof e.over.data.current?.instanceIndex === "number") {
        dispatch({ type: "move", id, index: e.over.data.current.instanceIndex })
        return
      }
      const from = page.blocks.findIndex((b) => b.id === id)
      dispatch({
        type: "move",
        id,
        index:
          typeof targetIndex === "number" && from < index ? index - 1 : index,
      })
    }
  }
  async function copy() {
    try {
      const { generatePage } = await import("./lib/export")
      await navigator.clipboard.writeText(generatePage(page, document.navbar, document.footer))
      setNotice("Código React copiado para a área de transferência")
    } catch {
      setNotice(
        "Área de transferência indisponível. Selecione o código ou baixe o arquivo TSX."
      )
    }
  }
  async function download() {
    const { generatePage } = await import("./lib/export")
    const url = URL.createObjectURL(
      new Blob([generatePage(page, document.navbar, document.footer)], { type: "text/plain" })
    )
    const a = window.document.createElement("a")
    a.href = url
    a.download = `${page.name.replace(/[^a-z0-9]/gi, "-") || "page"}.tsx`
    a.click()
    URL.revokeObjectURL(url)
    setNotice("Página React baixada")
  }
  return loading ? (
    <PageLoader layout="page" label="Carregando projeto" />
  ) : loadFailed ? (
    <div role="alert" className="p-8">
      {saveError || "Não foi possível abrir o projeto."}
      <Button
        variant="link"
        className="ml-4"
        onClick={() => window.location.reload()}
      >
        Tentar novamente
      </Button>
    </div>
  ) : (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={detectCollision}
        onDragStart={(e) => {
          keyboardTarget.current =
            e.activatorEvent instanceof KeyboardEvent ? e.active.id : null
          setDragging(true)
          setDragLabel(
            e.active.data.current?.definitionId
              ? (definitions.get(e.active.data.current.definitionId)?.name ??
                  "Bloco")
              : "Mover seção"
          )
        }}
        onDragEnd={endDrag}
        onDragCancel={() => setDragging(false)}
      >
        <MainLayout
          sidebar={
            <AppSidebar
              section="editor"
              collapsed={sidebarCollapsed}
              onClose={() => setSidebar(false)}
            >
              <Catalog
                themeStyle={projectThemeStyle}
                collapsed={sidebarCollapsed}
                onExpand={() => {
                  setSidebarCollapsed(false)
                  localStorage.setItem("builder-sidebar-collapsed", "false")
                }}
                tab={catalogTab}
                setTab={setCatalogTab}
                document={document}
                dispatch={dispatch}
                onAdoptTemplate={(template, regions) => adoptTemplateRegions(template.id, template.versionId, regions)}
                canAdoptTemplate={project !== null}
                searchRef={searchRef}
                onRename={(id) => {
                  setRenameId(id)
                  setName(document.pages.find((p) => p.id === id)?.name ?? "")
                }}
                onDelete={(id) => setConfirm({ type: "delete", id })}
              />
            </AppSidebar>
          }
          mobileSidebar={
            <AppSidebar section="editor" onClose={() => setSidebar(false)}>
              <Catalog
                themeStyle={projectThemeStyle}
                collapsed={false}
                onExpand={() => {}}
                tab={catalogTab}
                setTab={setCatalogTab}
                document={document}
                dispatch={dispatch}
                onAdoptTemplate={(template, regions) => adoptTemplateRegions(template.id, template.versionId, regions)}
                canAdoptTemplate={project !== null}
                searchRef={searchRef}
                onRename={(id) => {
                  setRenameId(id)
                  setName(document.pages.find((p) => p.id === id)?.name ?? "")
                }}
                onDelete={(id) => setConfirm({ type: "delete", id })}
              />
            </AppSidebar>
          }
          header={
            <BuilderHeader
              document={document}
              page={page}
              dispatch={dispatch}
              preview={preview}
              setPreview={setPreview}
              viewport={viewport}
              setViewport={setViewport}
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              outlineOpen={outlineOpen}
              themeLabOpen={themeLabOpen}
              onToggleThemeLab={() =>
                themeLabOpen ? setThemeLabOpen(false) : openThemeLab()
              }
              setOutlineOpen={setOutlineOpen}
              setNotice={setNotice}
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onExport={() => setExportOpen(true)}
              onCopy={copy}
              onDownload={download}
              onClear={() => setConfirm({ type: "clear" })}
              persisted={!!project}
              projectRevision={project?.revision}
              saveStatus={saveStatus}
              onRestored={loadServerVersion}
            />
          }
          mobileOpen={sidebar}
          onMobileOpenChange={setSidebar}
          showSidebar={!preview && sidebar}
          sidebarLabel="Catálogo de blocos"
          contentClassName="flex min-w-0 flex-col"
          rightSidebar={
            !preview && themeLabOpen ? (
              <aside className="builder-ui h-full w-[360px] min-w-0 max-w-[min(360px,100vw)] shrink-0 overflow-hidden border-l border-border bg-card">
              <ThemeEditorPanel
                theme={themeDraft}
                dirty={!themeDraft.presetId || Boolean(savedThemes.find((item) => item.id === themeDraft.presetId) && JSON.stringify(savedThemes.find((item) => item.id === themeDraft.presetId)?.configuration) !== JSON.stringify({ ...themeDraft, presetId: undefined }))}
                onUpdate={(changes) => applyThemeChange((current) => ({
                  ...current,
                  ...changes,
                  preset: Object.keys(changes).every((key) => key === "mode")
                    ? current.preset
                    : current.presetId ? current.preset : "Custom",
                }))}
                onColorChange={(key: ColorKey, value) => applyThemeChange((current) => updateThemeColor(current, key, value))}
                onSelectPreset={(name) => {
                  const preset = themePresets[name as keyof typeof themePresets]
                  if (!preset) return
                  setExampleDecision("unset")
                  commitTheme({ ...themeDraft, preset: name, presetId: undefined, light: { ...preset.light }, dark: { ...preset.dark } })
                }}
                savedThemes={savedThemes}
                loadingThemes={themeLoading}
                hasMoreThemes={savedThemeHasMore}
                loadingMoreThemes={savedThemeLoadingMore}
                onLoadMoreThemes={() => void loadMoreSavedThemes()}
                onLoadSavedTheme={(saved) => {
                  setExampleDecision("unset")
                  commitTheme(savedThemeDraft(saved))
                }}
                saving={themeSaving}
                onRequestDeleteTheme={setThemeDeleteTarget}
                onRequestRenameTheme={setThemeRenameTarget}
                onReset={() => {
                  setExampleDecision("unset")
                  commitTheme(defaultProjectTheme())
                }}
              />
              </aside>
            ) : (
              !preview &&
              outlineOpen && (
                <Outline
                  themeStyle={projectThemeStyle}
                  blocks={page.blocks}
                  dispatch={dispatch}
                  onEdit={editBlock}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onClear={() => setConfirm({ type: "clear" })}
                />
              )
            )
          }
        >
          <a
            href="#builder-canvas"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-3"
          >
            Skip to canvas
          </a>
          <main
            id="builder-canvas"
            tabIndex={-1}
            className="builder-grid min-h-0 flex-1 overflow-auto p-6 max-sm:p-3"
          >
            <div
              className="mx-auto w-full"
              data-testid="page-canvas"
              style={{
                width: simulatedWidth ? `${simulatedWidth}px` : "100%",
                maxWidth: canvasMaxWidth,
              }}
            >
              <h1 className="sr-only">{page.name}</h1>
              {preview ? (
                <div
                  className="builder-authored-content rounded-lg border bg-background"
                  data-testid="preview"
                  style={{
                    ...projectThemeStyle,
                    maxHeight: "calc(100svh - var(--builder-header-height) - 3rem)",
                    overflow: "auto",
                  }}
                  onClickCapture={(event) => {
                    const target = event.target
                    if (target instanceof Element && target.closest("[data-editor-action], [data-inline-editable], [data-inline-image], [data-inline-editor-control]")) return
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                  onSubmitCapture={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                >
                  <PageContent
                    page={page}
                    navbar={document.navbar}
                    footer={document.footer}
                    document={document}
                    projectId="preview"
                    themeStyle={projectThemeStyle}
                  />
                </div>
              ) : (
                <>
                {document.navbar && <ProjectNavbarEditor
                  block={{ ...document.navbar, props: resolveNavbarProps(document.navbar, document, project?.id) }}
                  dispatch={dispatch}
                  onEdit={editBlock}
                  selected={document.navbar.id === selectedId}
                  onSelect={setSelectedId}
                  inlineSelection={inlineSelection?.blockId === document.navbar.id ? inlineSelection : null}
                  inlineEditing={inlineEditing?.blockId === document.navbar.id ? inlineEditing : null}
                  onInlineSelect={selectInline}
                  onInlineStart={startInline}
                  onInlineCommit={commitInline}
                  onInlineCancel={cancelInline}
                  themeStyle={projectThemeStyle}
                  regionLabel="Cabeçalho do projeto"
                  protectedRegion={!!document.regionOrigins?.navbar}
                />}
                <Canvas
                  blocks={page.blocks}
                  dispatch={dispatch}
                  onEdit={editBlock}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  dragging={dragging}
                  inlineSelection={inlineSelection}
                  inlineEditing={inlineEditing}
                  onInlineSelect={selectInline}
                  onInlineStart={startInline}
                  onInlineCommit={commitInline}
                  onInlineCancel={cancelInline}
                  themeStyle={projectThemeStyle}
                  allowedDefinitionIds={page.composition?.allowedDefinitionIds}
                />
                {document.footer && <ProjectNavbarEditor
                  block={document.footer}
                  dispatch={dispatch}
                  onEdit={editBlock}
                  selected={document.footer.id === selectedId}
                  onSelect={setSelectedId}
                  inlineSelection={inlineSelection?.blockId === document.footer.id ? inlineSelection : null}
                  inlineEditing={inlineEditing?.blockId === document.footer.id ? inlineEditing : null}
                  onInlineSelect={selectInline}
                  onInlineStart={startInline}
                  onInlineCommit={commitInline}
                  onInlineCancel={cancelInline}
                  themeStyle={projectThemeStyle}
                  regionLabel="Rodapé do projeto"
                  protectedRegion={!!document.regionOrigins?.footer}
                />}
                </>
              )}
            </div>
          </main>
        </MainLayout>
        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div
              data-testid="drag-overlay"
              className="rounded-lg border border-primary bg-card px-6 py-4 text-sm"
            >
              {dragLabel}
            </div>
          )}
        </DragOverlay>
        <BuilderDialogs
          document={document}
          selected={selected}
          dispatch={dispatch}
          exportOpen={exportOpen}
          setExportOpen={setExportOpen}
          setEditId={setEditId}
          renameId={renameId}
          setRenameId={setRenameId}
          name={name}
          setName={setName}
          confirm={confirm}
          setConfirm={setConfirm}
        />

        <CenterMorphModal
          open={examplePromptOpen}
          onOpenChange={(open) => {
            if (!open && examplePromptOpen) void handleExampleEdit(false)
            if (open) {
              setExampleThemeName(`${themeDraft.preset} personalizado`)
              setExampleThemeError("")
            }
          }}
        >
          <CenterMorphModalContent
            ariaLabel="Salvar tema de exemplo"
            closeButtonLabel="Fechar"
            className="builder-ui space-y-5 rounded-xl border-border bg-card p-5 text-foreground"
            backdropClassName="bg-black/60"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void handleExampleEdit(true)
              }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-base font-semibold">Salvar este tema?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ao editar o exemplo, você pode salvá-lo na sua biblioteca. As alterações serão aplicadas ao projeto automaticamente.
                </p>
              </div>
              <Input
                autoFocus
                label="Nome do tema"
                value={exampleThemeName}
                onChange={setExampleThemeName}
                maxLength={80}
                required
                error={exampleThemeError || undefined}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => void handleExampleEdit(false)}>
                  Editar sem salvar
                </Button>
                <Button type="submit" disabled={themeSaving}>
                  {themeSaving ? "Salvando…" : "Salvar tema"}
                </Button>
              </div>
            </form>
          </CenterMorphModalContent>
        </CenterMorphModal>
        <ThemeDeleteDialog
          deleteTarget={themeDeleteTarget}
          deleting={themeSaving}
          onClose={() => setThemeDeleteTarget(null)}
          onDelete={() => {
            if (!accessToken || !themeDeleteTarget) return
            setThemeSaving(true)
            void deleteTheme(accessToken, themeDeleteTarget.id)
              .then(() => {
                setSavedThemes((current) => current.filter((item) => item.id !== themeDeleteTarget.id))
                if (themeDraft.presetId === themeDeleteTarget.id) commitTheme(defaultProjectTheme())
                setThemeDeleteTarget(null)
              })
              .catch((error) => setThemeError(error instanceof Error ? error.message : "Não foi possível excluir o tema."))
              .finally(() => setThemeSaving(false))
          }}
        />
        <ThemeRenameDialog
          key={`${themeRenameTarget?.id ?? "closed"}:${themeRenameTarget?.name ?? ""}`}
          theme={themeRenameTarget}
          saving={themeSaving}
          error={themeError}
          onClose={() => setThemeRenameTarget(null)}
          onRename={(name) => {
            if (!accessToken || !themeRenameTarget) return
            setThemeSaving(true)
            void updateSavedTheme(accessToken, { ...themeRenameTarget, name, configuration: themeDraft.presetId === themeRenameTarget.id ? themeDraft : themeRenameTarget.configuration })
              .then((updated) => {
                setSavedThemes((current) => current.map((item) => item.id === updated.id ? updated : item))
                if (themeDraft.presetId === updated.id) commitTheme({ ...themeDraft, preset: updated.name })
                setThemeRenameTarget(null)
                setThemeError("")
              })
              .catch((error) => setThemeError(error instanceof Error ? error.message : "Não foi possível renomear o tema."))
              .finally(() => setThemeSaving(false))
          }}
        />

        {(notice || saveError) && (
          <Alert
            role={saveError ? "alert" : "status"}
            aria-live={saveError ? "assertive" : "polite"}
            variant={saveError ? "destructive" : "default"}
            className="fixed bottom-14 left-1/2 z-50 w-auto max-w-[calc(100vw-2rem)] -translate-x-1/2"
          >
            {saveError && (
              <AlertTitle>Não foi possível salvar as alterações</AlertTitle>
            )}
            <AlertDescription>{saveError || notice}</AlertDescription>
            {conflict && (
              <Button
                type="button"
                variant="link"
                className="mt-2"
                onClick={() => {
                  if (
                    window.confirm(
                      "Salve uma cópia pelo menu Projeto antes de abrir a versão do servidor. Seu rascunho local será mantido neste navegador. Continuar?"
                    )
                  ) {
                    void loadServerVersion().catch((error) =>
                      setNotice(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível carregar a versão do servidor."
                      )
                    )
                  }
                }}
              >
                Abrir versão do servidor
              </Button>
            )}
          </Alert>
        )}
      </DndContext>
    </TooltipProvider>
  )
}
