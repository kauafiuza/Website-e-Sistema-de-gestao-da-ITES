import { Kbd } from "@/components/ui/kbd"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { useDraggable } from "@dnd-kit/core"
import {
  FileText,
  ArrowLeft,
  Grid2X2,
  Layers,
  List,
  MousePointerClick,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/context/auth/auth.context"
import { useOrganization } from "@/context/organization/organization.context"
import {
  archiveOrganizationPageTemplate,
  createOrganizationPageTemplate,
  createOrganizationPageTemplateVersion,
  listOrganizationPageTemplates,
  type OrganizationPageTemplate,
  type PageTemplateContent,
} from "@/services/organizations/page-template.service"
import { BlocksPreview } from "@/components/previews/BlocksPreview"
import { PageTemplateCatalog } from "@/components/PageTemplateCatalog"
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconTooltipButton } from "./IconTooltipButton"
import { Input } from "@/components/ui/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/motion/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Tooltip } from "@/components/motion/tooltip"
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/motion/file-tree"
import {
  bundledTemplateOrigin,
  copyTemplateBlocks,
  organizationTemplateOrigin,
  templateBlocks,
  templateNavbar,
} from "../lib/templates"
import {
  categories,
  blocksByGroup,
  registry,
  variantsByCategory,
  type Definition,
} from "@/utils/blocks"
import { uid } from "../lib/document"
import type { Action, BuilderDocument, Page } from "../lib/document"
import {
  useEffect,
  useState,
  type CSSProperties,
  type Dispatch,
  type RefObject,
} from "react"

type PageTreeEntry = {
  id: string
  name: string
  children: PageTreeEntry[]
}

function createPageTree(pages: BuilderDocument["pages"]): PageTreeEntry[] {
  const entries = new Map<string, PageTreeEntry>()
  for (const page of pages)
    entries.set(page.id, { id: page.id, name: page.name, children: [] })

  const roots: PageTreeEntry[] = []
  for (const page of pages) {
    const entry = entries.get(page.id)!
    const parentId = page.parentPageId
    const parent = parentId ? entries.get(parentId) : undefined
    if (parent && parent.id !== entry.id) parent.children.push(entry)
    else roots.push(entry)
  }

  // Malformed parent cycles are surfaced from root so the editor stays usable.
  const reachable = new Set<string>()
  const markReachable = (entry: PageTreeEntry) => {
    if (reachable.has(entry.id)) return
    reachable.add(entry.id)
    entry.children.forEach(markReachable)
  }
  roots.forEach(markReachable)
  for (const entry of entries.values()) {
    if (!reachable.has(entry.id))
      roots.push({ id: entry.id, name: entry.name, children: [] })
  }
  return roots
}

function renderPageTree(entries: PageTreeEntry[]) {
  return entries.map((entry) =>
    entry.children.length ? (
      <FileTreeFolder key={entry.id} value={entry.id} name={entry.name}>
        {renderPageTree(entry.children)}
      </FileTreeFolder>
    ) : (
      <FileTreeFile key={entry.id} value={entry.id} name={entry.name} />
    ),
  )
}

function templatePreviewBlocks(template: OrganizationPageTemplate) {
  return template.content.blocks.map((block, index) => ({
    ...structuredClone(block),
    id: block.id ?? `${template.id}-${template.version}-${index}`,
  }))
}

function visiblePageIds(
  entries: PageTreeEntry[],
  expandedIds: ReadonlySet<string>,
): string[] {
  return entries.flatMap((entry) => [
    entry.id,
    ...(expandedIds.has(entry.id)
      ? visiblePageIds(entry.children, expandedIds)
      : []),
  ])
}

function templateContent(page: Page, document: BuilderDocument): PageTemplateContent {
  const allowedDefinitionIds = new Set(page.composition?.allowedDefinitionIds ?? [])
  page.blocks.forEach((block) => allowedDefinitionIds.add(block.definitionId))
  const regions: PageTemplateContent["regions"] = {}
  if (document.navbar) regions.navbar = structuredClone(document.navbar)
  if (document.footer) regions.footer = structuredClone(document.footer)
  const protectedRegions = Object.keys(regions) as Array<"navbar" | "footer">
  return {
    blocks: structuredClone(page.blocks),
    composition: { allowedDefinitionIds: [...allowedDefinitionIds], protectedRegions },
    ...(protectedRegions.length ? { regions } : {}),
  }
}

function Thumbnail({
  definition,
  themeStyle,
  onAdd,
  onAddVariation,
  viewMode,
  disabled = false,
  allowedDefinitionIds,
}: {
  definition: Definition
  themeStyle: CSSProperties
  onAdd: () => void
  onAddVariation: (definitionId: string) => void
  viewMode: "grid" | "list"
  disabled?: boolean
  allowedDefinitionIds?: string[]
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog:${definition.id}`,
    data: { definitionId: definition.id },
    disabled,
  })
  const variations = (variantsByCategory.get(definition.category) ?? [])
    .filter((variation) => !allowedDefinitionIds || allowedDefinitionIds.includes(variation.id))

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          {...listeners}
          data-testid="catalog-thumbnail"
          data-definition={definition.id}
          data-layout={viewMode}
          className={`group overflow-hidden rounded-xl border bg-card transition-[border-color,opacity] duration-200 ${disabled ? "opacity-55" : "hover:border-primary"} ${viewMode === "list" ? "flex items-stretch" : ""} ${isDragging ? "opacity-40" : ""}`}
        >
          <div
            {...attributes}
            aria-label={`Arrastar ${definition.name}`}
            title={`Arrastar ${definition.name}`}
            className={`@container relative cursor-grab overflow-hidden bg-muted/20 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset active:cursor-grabbing ${viewMode === "list" ? "h-28 w-2/5 shrink-0" : "h-24 w-full"}`}
          >
            <BlocksPreview
              blocks={[
                {
                  id: definition.id,
                  definitionId: definition.id,
                  props: definition.defaults,
                },
              ]}
              themeStyle={themeStyle}
              className="absolute inset-0"
            />
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={onAdd}
            disabled={disabled}
            className={`h-auto justify-between text-left whitespace-normal ${viewMode === "list" ? "min-w-0 flex-1 px-3" : "w-full border-t p-3"}`}
            aria-label={disabled
              ? `${definition.name}: indisponível neste modelo`
              : `Adicionar ${definition.name}`}
          >
            <span className="min-w-0 truncate">{disabled ? "Indisponível neste modelo" : definition.name}</span>
            {!disabled && <Plus size={14} className="shrink-0 text-primary" />}
          </Button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuLabel>{definition.category}</ContextMenuLabel>
          <ContextMenuItem disabled={disabled} onClick={onAdd}>{disabled ? "Indisponível neste modelo" : "Adicionar à página"}</ContextMenuItem>
        </ContextMenuGroup>
        {variations.length > 1 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>Ver variações</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuGroup>
                  {variations.map((variation) => (
                    <ContextMenuItem
                      key={variation.id}
                      onClick={() => onAddVariation(variation.id)}
                    >
                      Adicionar {variation.name}
                    </ContextMenuItem>
                  ))}
                </ContextMenuGroup>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
export function Catalog({
  themeStyle,
  document,
  dispatch,
  searchRef,
  onRename,
  onDelete,
  onAdoptTemplate,
  canAdoptTemplate,
  tab,
  setTab,
  collapsed,
  onExpand,
}: {
  themeStyle: CSSProperties
  collapsed: boolean
  onExpand: () => void
  tab: string
  setTab: (value: string) => void
  document: BuilderDocument
  dispatch: Dispatch<Action>
  searchRef: RefObject<HTMLInputElement | null>
  onRename: (id: string) => void
  onDelete: (id: string) => void
  onAdoptTemplate: (template: OrganizationPageTemplate, regions: Array<"navbar" | "footer">) => Promise<void>
  canAdoptTemplate: boolean
}) {
  const { accessToken, user } = useAuth()
  const { selectedOrganization } = useOrganization()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [treeExpandedIds, setTreeExpandedIds] = useState(["project"])
  const [contextPageId, setContextPageId] = useState<string | null>(null)
  const [templateRequest, setTemplateRequest] = useState<{
    key: string
    items: OrganizationPageTemplate[]
    error: string
  } | null>(null)
  const [templatesRetry, setTemplatesRetry] = useState(0)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateSaveError, setTemplateSaveError] = useState("")
  const [previewTemplate, setPreviewTemplate] = useState<OrganizationPageTemplate | null>(null)
  const [templateActionError, setTemplateActionError] = useState("")
  const [templateActionId, setTemplateActionId] = useState<string | null>(null)
  const [archiveTemplateTarget, setArchiveTemplateTarget] = useState<OrganizationPageTemplate | null>(null)
  const [adoptionTemplateTarget, setAdoptionTemplateTarget] = useState<OrganizationPageTemplate | null>(null)
  const organizationId = selectedOrganization?.id ?? ""
  const activePage = document.pages.find((page) => page.id === document.activePageId)
  const isAllowedDefinition = (definitionId: string) =>
    !activePage?.composition || activePage.composition.allowedDefinitionIds.includes(definitionId)
  const templateRequestKey = JSON.stringify([accessToken, organizationId, tab, templatesRetry])
  const shouldLoadTemplates = Boolean(accessToken && organizationId && tab === "pages")
  const currentTemplateRequest = templateRequest?.key === templateRequestKey ? templateRequest : null
  const organizationTemplates = currentTemplateRequest?.items ?? []
  const templatesLoading = shouldLoadTemplates && currentTemplateRequest === null
  const templatesError = currentTemplateRequest?.error ?? ""
  useEffect(() => {
    if (!accessToken || !organizationId || tab !== "pages") return
    let active = true
    void listOrganizationPageTemplates(accessToken, organizationId)
      .then((items) => {
        if (active) setTemplateRequest({ key: templateRequestKey, items, error: "" })
      })
      .catch((error: unknown) => {
        if (active) setTemplateRequest({
          key: templateRequestKey,
          items: [],
          error: error instanceof Error ? error.message : "Não foi possível carregar os modelos.",
        })
      })
    return () => { active = false }
  }, [accessToken, organizationId, tab, templatesRetry, templateRequestKey])
  const saveCurrentPageAsTemplate = async () => {
    const organizationId = selectedOrganization?.id
    const page = document.pages.find((item) => item.id === document.activePageId)
    if (!accessToken || !organizationId || !page || !templateName.trim()) return
    setTemplateSaving(true)
    setTemplateSaveError("")
    try {
      const saved = await createOrganizationPageTemplate(accessToken, organizationId, templateName.trim(), templateContent(page, document))
      setTemplateRequest((current) => current?.key === templateRequestKey
        ? { ...current, items: [saved, ...current.items.filter((item) => item.id !== saved.id)] }
        : current)
      setSaveTemplateOpen(false)
      setTemplateName("")
    } catch (error) {
      setTemplateSaveError(error instanceof Error ? error.message : "Não foi possível salvar o modelo.")
    } finally {
      setTemplateSaving(false)
    }
  }
  const saveCurrentPageAsTemplateVersion = async (template: OrganizationPageTemplate) => {
    const organizationId = selectedOrganization?.id
    const page = document.pages.find((item) => item.id === document.activePageId)
    if (!accessToken || !organizationId || !page) return
    setTemplateActionId(template.id)
    setTemplateActionError("")
    try {
      const updated = await createOrganizationPageTemplateVersion(accessToken, organizationId, template, templateContent(page, document))
      setTemplateRequest((current) => current?.key === templateRequestKey
        ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }
        : current)
    } catch (error) {
      setTemplateActionError(error instanceof Error ? error.message : "Não foi possível criar a nova versão.")
    } finally {
      setTemplateActionId(null)
    }
  }
  const archiveTemplate = async () => {
    const organizationId = selectedOrganization?.id
    if (!accessToken || !organizationId || !archiveTemplateTarget) return
    setTemplateActionId(archiveTemplateTarget.id)
    setTemplateActionError("")
    try {
      await archiveOrganizationPageTemplate(accessToken, organizationId, archiveTemplateTarget.id)
      setTemplateRequest((current) => current?.key === templateRequestKey
        ? { ...current, items: current.items.filter((item) => item.id !== archiveTemplateTarget.id) }
        : current)
      setArchiveTemplateTarget(null)
    } catch (error) {
      setTemplateActionError(error instanceof Error ? error.message : "Não foi possível arquivar o modelo.")
    } finally {
      setTemplateActionId(null)
    }
  }
  const adoptTemplateRegions = async () => {
    if (!adoptionTemplateTarget) return
    const regions = (adoptionTemplateTarget.content.composition?.protectedRegions ?? [])
      .filter((region): region is "navbar" | "footer" => region === "navbar" || region === "footer")
    if (!regions.length) return
    setTemplateActionId(adoptionTemplateTarget.id)
    setTemplateActionError("")
    try {
      await onAdoptTemplate(adoptionTemplateTarget, regions)
      setAdoptionTemplateTarget(null)
    } catch (error) {
      setTemplateActionError(error instanceof Error ? error.message : "Não foi possível atualizar as áreas compartilhadas.")
    } finally {
      setTemplateActionId(null)
    }
  }
  const filtered = registry.filter((d) =>
    `${d.name} ${d.description}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <>
      {collapsed ? (
        <div className="flex flex-1 flex-col items-center gap-2 py-3 max-md:hidden">
          <IconTooltipButton
            variant={tab === "blocks" ? "secondary" : "ghost"}
            size="icon"
            label="Blocos"
            onClick={() => setTab("blocks")}
          >
            <Layers />
          </IconTooltipButton>
          <IconTooltipButton
            variant={tab === "pages" ? "secondary" : "ghost"}
            size="icon"
            label="Páginas"
            onClick={() => setTab("pages")}
          >
            <FileText />
          </IconTooltipButton>
          <IconTooltipButton
            variant="ghost"
            size="icon"
            label="Buscar blocos"
            onClick={() => {
              setTab("blocks")
              onExpand()
              requestAnimationFrame(() => searchRef.current?.focus())
            }}
          >
            <Search />
          </IconTooltipButton>
        </div>
      ) : (
        <>
          <div className="border-b p-2">
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as "blocks" | "pages")}
              variant="segment"
            >
              <TabsList
                aria-label="Navegação do editor"
                className="grid grid-cols-2 bg-muted/60"
              >
                <TabsTrigger
                  value="blocks"
                  icon={<Layers className="size-4" />}
                >
                  Blocos
                </TabsTrigger>
                <TabsTrigger
                  value="pages"
                  icon={<FileText className="size-4" />}
                >
                  <span aria-hidden="true" className="text-xs tabular-nums px-2">
                    {document.pages.length}
                  </span>
                  { document.pages.length !== 1 ? "Páginas" : "Página"}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {tab === "blocks" && activePage?.composition && (
            <p className="px-3 pb-2 text-xs leading-5 text-muted-foreground">
              Este padrão permite {activePage.composition.allowedDefinitionIds.length} tipos de bloco. As outras opções ficam indisponíveis nesta página.
            </p>
          )}
          {tab === "blocks" ? (
            <>
              <div className="m-2 mt-2 mb-3 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="absolute top-2.5 left-3 text-muted-foreground"
                    size={14}
                    aria-hidden="true"
                  />
                  <Input
                    ref={searchRef}
                    aria-label="Buscar blocos"
                    placeholder="Buscar blocos..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setCategory(null)
                    }}
                    className="h-9 rounded-md border-0 pr-11 pl-9 text-sm"
                  />
                  <Kbd className="absolute top-2 right-2">⌘ K</Kbd>
                </div>
                <Popover align="end">
                  <PopoverTrigger>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Layout da prévia dos blocos"
                      className="size-9 shrink-0 rounded-md"
                    >
                      <SlidersHorizontal />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="builder-ui glass-frosted w-52 p-3">
                    <p className="mb-2 text-xs font-medium">
                      Prévia dos blocos
                    </p>
                    <ToggleGroup
                      aria-label="Layout da prévia dos blocos"
                      value={[viewMode]}
                      onValueChange={(values) => {
                        const selected = values[0]
                        if (selected === "grid" || selected === "list")
                          setViewMode(selected)
                      }}
                      variant="default"
                      spacing={0}
                      className="w-full"
                    >
                      <ToggleGroupItem
                        value="grid"
                        aria-label="Visualização em grade"
                        className="h-8 flex-1"
                      >
                        <Grid2X2 />
                        Grade
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="list"
                        aria-label="Visualização em lista"
                        className="h-8 flex-1"
                      >
                        <List />
                        Lista
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </PopoverContent>
                </Popover>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="px-2 pb-5">
                  {search ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mb-3 text-xs"
                        onClick={() => {
                          setCategory(null)
                          setSearch("")
                        }}
                      >
                        <ArrowLeft />
                        Todas as categorias
                      </Button>
                      <p className="mb-4 px-1 text-xs text-muted-foreground">
                        {filtered.length} blocos · Clique para adicionar ou
                        arraste para a página
                      </p>
                      <div
                        data-testid="catalog-results"
                        data-layout={viewMode}
                        className={
                          viewMode === "grid"
                            ? "grid grid-cols-2 gap-2"
                            : "flex flex-col gap-2"
                        }
                      >
                        {filtered.map((d) => (
                          <Thumbnail
                            key={d.id}
                            definition={d}
                            themeStyle={themeStyle}
                            viewMode={viewMode}
                            disabled={!isAllowedDefinition(d.id)}
                            allowedDefinitionIds={activePage?.composition?.allowedDefinitionIds}
                            onAdd={() =>
                              dispatch({
                                type: "add",
                                id: uid(),
                                definitionId: d.id,
                              })
                            }
                            onAddVariation={(definitionId) =>
                              dispatch({ type: "add", id: uid(), definitionId })
                            }
                          />
                        ))}
                      </div>
                      {filtered.length === 0 && (
                        <Empty role="status" className="min-h-36 p-5">
                          <EmptyHeader>
                            <EmptyTitle className="text-base">
                              Nenhum bloco encontrado
                            </EmptyTitle>
                            <EmptyDescription>
                              Tente outro termo ou escolha Todas as categorias
                              para explorar o catálogo.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </>
                  ) : (
                    <>
                      <Accordion
                        className="gap-2 overflow-visible rounded-none border-0"
                        value={category ? [category] : []}
                        onValueChange={(values) =>
                          setCategory(String(values[0] ?? "") || null)
                        }
                      >
                        {categories.map((c) => (
                          <AccordionItem
                            key={c.id}
                            value={c.id}
                            className="border-b border-border/35"
                          >
                            <AccordionTrigger
                              aria-label={c.name}
                              className="min-h-9 items-center gap-2 px-2 py-1.5 text-sm font-normal"
                            >
                              <span>{c.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                {blocksByGroup.get(c.id)?.length ?? 0}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div
                                data-testid="catalog-results"
                                data-layout={viewMode}
                                className={
                                  viewMode === "grid"
                                    ? "grid grid-cols-2 gap-2"
                                    : "flex flex-col gap-2"
                                }
                              >
                                {(blocksByGroup.get(c.id) ?? []).map(
                                  (d) => (
                                    <Thumbnail
                                      key={d.id}
                                      definition={d}
                                      themeStyle={themeStyle}
                                      viewMode={viewMode}
                                      disabled={!isAllowedDefinition(d.id)}
                                      allowedDefinitionIds={activePage?.composition?.allowedDefinitionIds}
                                      onAdd={() =>
                                        dispatch({
                                          type: "add",
                                          id: uid(),
                                          definitionId: d.id,
                                        })
                                      }
                                      onAddVariation={(definitionId) =>
                                        dispatch({
                                          type: "add",
                                          id: uid(),
                                          definitionId,
                                        })
                                      }
                                    />
                                  )
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-3">
                <Button
                  variant="secondary"
                  className="mb-3 w-full rounded-md"
                  onClick={() =>
                    dispatch({
                      type: "create",
                      id: uid(),
                      name: `Page ${document.pages.length + 1}`,
                    })
                  }
                >
                  <Plus />
                  Nova página
                </Button>
                <ContextMenu>
                  <ContextMenuTrigger
                    render={<div />}
                    onContextMenu={(event) => {
                      const row = (event.target as HTMLElement).closest(
                        '[role="treeitem"]',
                      )
                      if (!row) {
                        setContextPageId(null)
                        return
                      }
                      const rows = Array.from(
                        row.closest('[role="tree"]')?.querySelectorAll(
                          '[role="treeitem"]',
                        ) ?? [],
                      )
                      const rowIndex = rows.indexOf(row)
                      const expanded = new Set(treeExpandedIds)
                      const visibleIds = [
                        "project",
                        ...(expanded.has("project")
                          ? visiblePageIds(
                              createPageTree(document.pages),
                              expanded,
                            )
                          : []),
                      ]
                      const id = visibleIds[rowIndex]
                      setContextPageId(
                        document.pages.some((page) => page.id === id)
                          ? id
                          : null,
                      )
                    }}
                  >
                    <Tooltip
                      side="top"
                      align="start"
                      content={
                        <span className="flex items-center gap-2">
                          <MousePointerClick
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                          Use o botão direito para renomear ou excluir
                        </span>
                      }
                    >
                      <div>
                        <FileTree
                          ariaLabel="Estrutura de páginas do projeto"
                          value={document.activePageId}
                          expandedIds={treeExpandedIds}
                          onExpandedChange={setTreeExpandedIds}
                          onValueChange={(id) => {
                            if (document.pages.some((page) => page.id === id))
                              dispatch({ type: "switch", id })
                          }}
                          className="pb-3"
                        >
                          <FileTreeFolder
                            value="project"
                            name={document.name || "Projeto"}
                          >
                            {renderPageTree(createPageTree(document.pages))}
                          </FileTreeFolder>
                        </FileTree>
                      </div>
                    </Tooltip>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      disabled={!contextPageId}
                      onClick={() => {
                        if (contextPageId) dispatch({ type: "create", id: uid(), name: `Subpágina ${document.pages.length + 1}`, parentPageId: contextPageId })
                      }}
                    >
                      Criar subpágina
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={!contextPageId}
                      onClick={() => {
                        if (contextPageId) onRename(contextPageId)
                      }}
                    >
                      Renomear
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={
                        !contextPageId || document.pages.length === 1
                      }
                      onClick={() => {
                        if (contextPageId) onDelete(contextPageId)
                      }}
                      variant="destructive"
                    >
                      Excluir
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                {(() => {
                  const activePage = document.pages.find(
                    (page) => page.id === document.activePageId,
                  )
                  if (!activePage) return null
                  return (
                    <div className="mb-4 border-b px-2 pb-3 text-xs text-muted-foreground">
                      <span className="block truncate">
                        {activePage.blocks.length}{" "}
                        {activePage.blocks.length === 1 ? "seção" : "seções"}
                      </span>
                    </div>
                  )
                })()}
                <Button
                  type="button"
                  variant="outline"
                  className="mb-2 w-full"
                  onClick={() => {
                    const page = document.pages.find((item) => item.id === document.activePageId)
                    setTemplateName(page?.name ?? "")
                    setTemplateSaveError("")
                    setSaveTemplateOpen(true)
                  }}
                >
                  Salvar página como modelo
                </Button>
                <h2 className="mt-6 mb-3 text-xs font-medium text-muted-foreground">
                  Modelos de página · designs originais
                </h2>
                <PageTemplateCatalog
                  mode="catalog"
                  themeStyle={themeStyle}
                  onSelect={(template) =>
                    dispatch({
                      type: "create",
                      id: uid(),
                      name: template.name,
                      blocks: templateBlocks(template.blocks),
                      theme: template.theme,
                      navbar: document.navbar
                        ? undefined
                        : templateNavbar(template.navbar, template.navbarItems),
                      templateOrigin: bundledTemplateOrigin(template),
                    })
                  }
                />
                <div className="mt-6 border-t pt-4">
                  <h2 className="mb-1 text-xs font-medium text-muted-foreground">
                    Modelos da organização
                  </h2>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Modelos compartilhados com membros desta organização. Cada uso cria uma cópia editável.
                  </p>
                  {templatesLoading && <p role="status" className="py-3 text-sm text-muted-foreground">Carregando modelos…</p>}
                  {templatesError && (
                    <div className="space-y-2 py-3">
                      <p role="alert" className="text-sm text-destructive">{templatesError}</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => setTemplatesRetry((retry) => retry + 1)}>
                        Tentar novamente
                      </Button>
                    </div>
                  )}
                  {templateActionError && <p role="alert" className="py-3 text-sm text-destructive">{templateActionError}</p>}
                  {!templatesLoading && !templatesError && organizationTemplates.length === 0 && (
                    <p className="py-3 text-sm text-muted-foreground">Ainda não há modelos salvos nesta organização.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {organizationTemplates.map((template) => (
                      <article key={template.id} className="overflow-hidden rounded-xl border bg-card">
                        <div className="@container relative h-28 overflow-hidden border-b bg-muted/20">
                          <BlocksPreview
                            blocks={templatePreviewBlocks(template)}
                            themeStyle={themeStyle}
                            className="absolute inset-0"
                          />
                        </div>
                        <div className="space-y-1 p-2">
                          <p className="truncate text-xs font-medium" title={template.name}>{template.name}</p>
                          <p className="text-[11px] text-muted-foreground">Versão {template.version}</p>
                          <div className="flex flex-col gap-1">
                            <Button type="button" size="sm" variant="ghost" onClick={() => setPreviewTemplate(template)}>
                              Pré-visualizar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => dispatch({
                                type: "create",
                                id: uid(),
                                name: template.name,
                                blocks: copyTemplateBlocks(template.content.blocks),
                                templateOrigin: organizationTemplateOrigin(template),
                                composition: template.content.composition,
                              })}
                            >
                              Usar modelo
                            </Button>
                            {!!template.content.composition?.protectedRegions?.length && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!canAdoptTemplate || templateActionId !== null}
                                title={!canAdoptTemplate ? "Salve o projeto para atualizar as áreas compartilhadas" : undefined}
                                onClick={() => setAdoptionTemplateTarget(template)}
                              >
                                Adotar áreas do modelo
                              </Button>
                            )}
                            {template.createdBy === user?.id && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={templateActionId !== null}
                                  onClick={() => void saveCurrentPageAsTemplateVersion(template)}
                                >
                                  {templateActionId === template.id ? "Salvando…" : "Criar versão da página atual"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={templateActionId !== null}
                                  onClick={() => setArchiveTemplateTarget(template)}
                                >
                                  Arquivar modelo
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </>
      )}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar página como modelo</DialogTitle>
            <DialogDescription>
              O modelo será compartilhado com membros ativos desta organização. Projetos existentes não serão alterados.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="page-template-name" className="text-sm font-medium">Nome do modelo</label>
          <Input
            id="page-template-name"
            autoFocus
            maxLength={150}
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            aria-invalid={Boolean(templateSaveError)}
          />
          {templateSaveError && <p role="alert" className="text-sm text-destructive">{templateSaveError}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={templateSaving} onClick={() => setSaveTemplateOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={templateSaving || !templateName.trim()} onClick={() => void saveCurrentPageAsTemplate()}>
              {templateSaving ? "Salvando…" : "Salvar modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={previewTemplate !== null} onOpenChange={(open) => { if (!open) setPreviewTemplate(null) }}>
        <DialogContent className="max-h-[90svh] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name ?? "Pré-visualização do modelo"}</DialogTitle>
            <DialogDescription>
              {previewTemplate ? `Versão ${previewTemplate.version}. A prévia não altera o projeto.` : ""}
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="@container h-[65svh] overflow-auto rounded-xl border bg-background">
              <BlocksPreview blocks={templatePreviewBlocks(previewTemplate)} themeStyle={themeStyle} className="min-h-full" />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPreviewTemplate(null)}>Fechar</Button>
            {previewTemplate && (
              <Button type="button" onClick={() => {
                dispatch({
                  type: "create",
                  id: uid(),
                  name: previewTemplate.name,
                  blocks: copyTemplateBlocks(previewTemplate.content.blocks),
                  templateOrigin: organizationTemplateOrigin(previewTemplate),
                })
                setPreviewTemplate(null)
              }}>Usar modelo</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={archiveTemplateTarget !== null} onOpenChange={(open) => { if (!open) setArchiveTemplateTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar modelo?</DialogTitle>
            <DialogDescription>
              {archiveTemplateTarget?.name} deixará de aparecer no catálogo da organização. Páginas que já usam uma cópia não serão alteradas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={templateActionId !== null} onClick={() => setArchiveTemplateTarget(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" disabled={templateActionId !== null} onClick={() => void archiveTemplate()}>
              {templateActionId ? "Arquivando…" : "Arquivar modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={adoptionTemplateTarget !== null} onOpenChange={(open) => { if (!open && templateActionId === null) setAdoptionTemplateTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar áreas compartilhadas?</DialogTitle>
            <DialogDescription>
              {adoptionTemplateTarget?.content.composition?.protectedRegions?.includes("navbar") && adoptionTemplateTarget.content.composition.protectedRegions.includes("footer")
                ? "O cabeçalho e o rodapé do projeto serão substituídos em todas as páginas."
                : adoptionTemplateTarget?.content.composition?.protectedRegions?.includes("navbar")
                  ? "O cabeçalho do projeto será substituído em todas as páginas."
                  : "O rodapé do projeto será substituído em todas as páginas."}
              {" "}O conteúdo das páginas será mantido.
            </DialogDescription>
          </DialogHeader>
          {templateActionError && <p role="alert" className="text-sm text-destructive">{templateActionError}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={templateActionId !== null} onClick={() => setAdoptionTemplateTarget(null)}>Cancelar</Button>
            <Button type="button" disabled={templateActionId !== null} onClick={() => void adoptTemplateRegions()}>
              {templateActionId ? "Atualizando…" : "Atualizar áreas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
