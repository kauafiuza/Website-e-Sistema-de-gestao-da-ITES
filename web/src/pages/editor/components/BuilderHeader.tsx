import { AppHeader } from "@/layout/MainLayout"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/motion/select"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import {
  Code2,
  ChevronDown,
  MoreHorizontal,
  Monitor,
  Smartphone,
  Eye,
  Trash2,
  Sun,
  Moon,
  ExternalLink,
  PanelRight,
  PanelRightClose,
  Palette,
  Undo,
  Redo,
} from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { ProjectMenu } from "./ProjectMenu"
import type { Action, BuilderDocument, Page } from "../lib/document"
import { AnimatedBadge } from "@/components/motion/animated-badge"
import { useAuth } from "@/context/auth/auth.context"
import { useOrganization } from "@/context/organization/organization.context"
import { builderPreviewStorageKey } from "../lib/document"
import { useParams } from "react-router-dom"
import { PublicationControl } from "./PublicationControl"
import { DraftHistoryControl } from "./DraftHistoryControl"
interface Props {
  document: BuilderDocument
  page: Page
  dispatch: Dispatch<Action>
  preview: boolean
  setPreview: Dispatch<SetStateAction<boolean>>
  viewport: string
  setViewport: (value: string) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  outlineOpen: boolean
  themeLabOpen: boolean
  onToggleThemeLab: () => void
  setOutlineOpen: Dispatch<SetStateAction<boolean>>
  setNotice: (value: string) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  onExport: () => void
  onCopy: () => void | Promise<void>
  onDownload: () => void | Promise<void>
  onClear: () => void
  persisted: boolean
  projectRevision?: number
  saveStatus: "error" | "saving" | "draft" | "up-to-date"
  onRestored: () => Promise<void>
}
export function BuilderHeader({
  document,
  page,
  dispatch,
  preview,
  setPreview,
  viewport,
  setViewport,
  sidebarCollapsed,
  toggleSidebar,
  outlineOpen,
  themeLabOpen,
  onToggleThemeLab,
  setOutlineOpen,
  setNotice,
  undo,
  redo,
  canUndo,
  canRedo,
  onExport,
  onCopy,
  onDownload,
  onClear,
  persisted,
  projectRevision,
  saveStatus,
  onRestored,
}: Props) {
  const { theme, setTheme } = useTheme()
  const { user, accessToken } = useAuth()
  const { selectedOrganization } = useOrganization()
  const { projectId } = useParams()
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState("")
  const ignoreNameBlur = useRef(false)
  const projectNameButton = useRef<HTMLButtonElement>(null)

  function finishNameEdit() {
    if (ignoreNameBlur.current) {
      ignoreNameBlur.current = false
      return
    }
    const nextName = draftName.trim()
    if (nextName && nextName !== document.name)
      dispatch({ type: "project-name", name: nextName })
    setEditingName(false)
  }
  return (
    <>
      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        back={preview}
        onToggleSidebar={() => (preview ? setPreview(false) : toggleSidebar())}
      >
        <div className="builder-toolbar-actions flex h-9 min-w-fit shrink items-center gap-1 rounded-md bg-background px-2 text-sm">
          {editingName ? (
            <Input
              autoFocus
              aria-label="Nome do projeto"
              className="h-7 w-16 rounded-sm px-1 text-sm sm:w-24 lg:w-32"
              value={draftName}
              maxLength={80}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={finishNameEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  event.currentTarget.blur()
                } else if (event.key === "Escape") {
                  event.preventDefault()
                  ignoreNameBlur.current = true
                  setEditingName(false)
                  requestAnimationFrame(() =>
                    projectNameButton.current?.focus()
                  )
                }
              }}
            />
          ) : (
            <Button
              ref={projectNameButton}
              type="button"
              variant="ghost"
              size="sm"
              title="Renomear projeto"
              className="h-7 w-16 justify-start rounded-sm px-1 font-normal text-muted-foreground sm:w-24 lg:w-32"
              onClick={() => {
                setDraftName(document.name)
                setEditingName(true)
              }}
            >
              <span className="truncate">{document.name}</span>
            </Button>
          )}
          <span className="text-muted-foreground">/</span>
          <Select
            value={page.id}
            onValueChange={(id) => dispatch({ type: "switch", id })}
            className="max-w-36 max-sm:max-w-20"
          >
            <SelectTrigger
              aria-label="Selecionar página"
              className="h-7 max-w-36 min-w-0 rounded-md! border-0! bg-transparent! px-1! shadow-none! max-sm:max-w-20"
            >
              <SelectValue className="truncate" />
            </SelectTrigger>
            <SelectContent className="builder-ui glass-frosted">
              {document.pages.map((page) => (
                <SelectItem key={page.id} value={page.id}>
                  {page.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        <AnimatedBadge
          size="sm"
          className="rounded-2xl"
          status={saveStatus === "error" ? "danger" : saveStatus === "saving" ? "loading" : saveStatus === "draft" ? "warning" : "success"}
          title={saveStatus === "error" ? "Falha ao salvar o projeto" : undefined}
        >
          {saveStatus === "error" ? "Erro ao salvar" : saveStatus === "saving" ? "Salvando…" : saveStatus === "draft" ? "Rascunho" : ""}
        </AnimatedBadge>
        </div>
        <div className="min-w-3 flex-1" />
        <div className="builder-toolbar-actions flex shrink-0 items-center gap-1 rounded-lg p-1 max-sm:gap-0 max-sm:bg-transparent max-sm:p-0">
          <div className="hidden xl:block">
            <ViewportControls viewport={viewport} setViewport={setViewport} />
          </div>
          <ButtonGroup className="shrink-0">
            <Button
              variant="secondary"
              size="sm"
              className="builder-toolbar-action shrink-0 rounded-r-none px-2.5"
              aria-label={preview ? "Sair da prévia" : "Prévia"}
              aria-pressed={preview}
              onClick={() => setPreview((v) => !v)}
            >
              <Eye />
              <span className="hidden sm:inline">
                {preview ? "Sair da prévia" : "Prévia"}
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    className="builder-toolbar-action h-8 w-7 rounded-l-none border-l border-border/60"
                    aria-label="Mais opções de prévia"
                    title="Mais opções de prévia"
                  />
                }
              >
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="builder-ui glass-frosted"
              >
                <DropdownMenuItem
                  onClick={() => {
                    if (!user || !selectedOrganization) return
                    const id = crypto.randomUUID()
                    localStorage.setItem(
                      builderPreviewStorageKey(user.id, selectedOrganization.id, id),
                      JSON.stringify(document),
                    )
                    window.open(
                      `/preview?document=${id}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }}
                >
                  <ExternalLink /> Abrir em nova aba
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
          <ButtonGroup className="hidden shrink-0">
            <Button
              variant="secondary"
              size="sm"
              className="builder-toolbar-action px-2.5"
              aria-label="Exportar código"
              title="Exportar código"
              onClick={onExport}
            >
              <Code2 />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <ButtonGroupSeparator className="bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    className="builder-toolbar-action"
                    aria-label="Mais opções de exportação"
                    title="Mais opções de exportação"
                  />
                }
              >
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="builder-ui glass-frosted"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => void onCopy()}>
                    Copiar código React
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void onDownload()}>
                    Baixar TSX
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
          <PublicationControl token={accessToken} projectId={projectId} projectRevision={projectRevision} persisted={persisted} saveStatus={saveStatus} onNotice={setNotice} />
          <DraftHistoryControl token={accessToken} projectId={projectId} projectRevision={projectRevision}
            persisted={persisted} saveStatus={saveStatus} onRestored={onRestored} />
          <Button 
            variant={themeLabOpen ? "outline" : "secondary"} 
            size="sm" 
            className="builder-toolbar-action shrink-0 px-2.5" 
            aria-pressed={themeLabOpen} 
            onClick={onToggleThemeLab} 
            title="Meus temas"
          >
            <Palette />
            <span className="hidden lg:inline">
              Temas
            </span>
          </Button>
          <ProjectMenu
            document={document}
            dispatch={dispatch}
            onNotice={setNotice}
            persisted={persisted}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Mais ações do editor"
                  title="Mais ações do editor"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="builder-ui glass-frosted min-w-48"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Ações do editor</DropdownMenuLabel>
                <DropdownMenuItem disabled={!canUndo} onClick={undo}>
                  <Undo /> Desfazer
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canRedo} onClick={redo}>
                  <Redo /> Refazer
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setOutlineOpen((open) => !open)}
                  className="hidden xl:flex"
                >
                  {outlineOpen ? <PanelRightClose /> : <PanelRight />}
                  {outlineOpen
                    ? "Ocultar estrutura da página"
                    : "Mostrar estrutura da página"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                >
                  {isDark ? <Sun /> : <Moon />}
                  Mudar para o tema {isDark ? "claro" : "escuro"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </AppHeader>
      <div className="builder-ui glass-subtle glass-toolbar flex h-10 shrink-0 items-center justify-between border-b bg-card px-3 xl:hidden">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {preview ? "PRÉVIA" : "EDITOR DE PÁGINAS"}
          <span className="mx-1 text-border">|</span>
          {page.blocks.length} {page.blocks.length === 1 ? "seção" : "seções"}
        </div>
        <ViewportControls viewport={viewport} setViewport={setViewport} />
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs text-muted-foreground ${!preview ? "xl:hidden" : ""}`}
          disabled={!page.blocks.length || preview}
          aria-label="Limpar página"
          onClick={onClear}
        >
          <Trash2 size={12} />
          <span className="hidden sm:inline">Limpar página</span>
        </Button>
      </div>
    </>
  )
}

function ViewportControls({
  viewport,
  setViewport,
}: {
  viewport: string
  setViewport: (value: string) => void
}) {
  return (
    <ToggleGroup
      aria-label="Largura de visualização do editor"
      value={[viewport]}
      onValueChange={(values) => {
        if (values[0]) setViewport(values[0])
      }}
      spacing={0}
      className="rounded-md bg-transparent p-0.5"
    >
      {[
        { id: "desktop", label: "desktop", icon: Monitor },
        { id: "mobile", label: "celular", icon: Smartphone },
      ].map(({ id, label, icon: Icon }) => (
        <ToggleGroupItem
          key={id}
          value={id}
          aria-label={`Visualização ${label}`}
          title={`Visualização ${label}`}
          className="size-7 min-w-0 rounded-sm! p-0 aria-pressed:bg-card aria-pressed:text-primary"
        >
          <Icon className="size-4" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
