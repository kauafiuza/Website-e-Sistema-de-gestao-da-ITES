import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth/auth.context"
import { AppHeader, MainLayout } from "@/layout/MainLayout"
import { PlatformBreadcrumb } from "@/layout/PlatformBreadcrumb"
import { AppSidebar } from "@/layout/PlatformSidebar"
import { WorkAreaPageHeader } from "@/layout/WorkAreaPageHeader"
import { Button } from "@/components/ui/button"
import { Plus, Save } from "lucide-react"
import { Input } from "@/components/motion/input"
import {
  CenterMorphModal,
  CenterMorphModalContent,
  CenterMorphModalTrigger,
} from "@/components/motion/center-morph-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useThemeLab } from "./lib/use-theme-lab"
import type { ThemePreviewKind } from "./lib/theme-lab"
import { ThemeEditorPanel } from "./components/ThemeEditorPanel"
import { ThemeDeleteDialog } from "./components/ThemeDeleteDialog"
import { ThemeRenameDialog } from "./components/ThemeRenameDialog"
import { ThemePreviewPanel } from "./components/ThemePreviewPanel"
import type { SavedTheme } from "@/services/projects/theme.service"

export default function ThemeLabPage() {
  const { accessToken } = useAuth()
  const [autoCreateDraft, setAutoCreateDraft] = useState(false)
  const {
    dirty,
    deleting,
    loadingThemes,
    hasMoreThemes,
    loadingMoreThemes,
    loadMoreThemes,
    removePreset,
    renamePreset,
    resetTheme,
    saving,
    savedThemes,
    saveCurrentTheme,
    loadSavedTheme,
    selectPreset,
    setColor,
    theme,
    themeError,
    updateTheme,
  } = useThemeLab(accessToken, autoCreateDraft)
  const [mobileNavigation, setMobileNavigation] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("builder-sidebar-collapsed") === "true"
  )
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  const [mobilePanel, setMobilePanel] = useState<"editor" | "preview">("editor")
  const [preview, setPreview] = useState<ThemePreviewKind>("Landing")
  const [deleteTarget, setDeleteTarget] = useState<SavedTheme | null>(null)
  const [renameTarget, setRenameTarget] = useState<SavedTheme | null>(null)
  const [exampleEditDecision, setExampleEditDecision] = useState<"unset" | "automatic" | "manual">("unset")
  const [pendingExampleEdit, setPendingExampleEdit] = useState<(() => void) | null>(null)
  const [createThemeDialogOpen, setCreateThemeDialogOpen] = useState(false)
  const [newThemeName, setNewThemeName] = useState("Meu tema")
  const [newThemeError, setNewThemeError] = useState("")

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

  async function handleDelete() {
    if (!deleteTarget) return
    await removePreset(deleteTarget.id)
    setDeleteTarget(null)
  }

  async function handleRename(name: string) {
    if (!renameTarget) return
    const renamed = await renamePreset(renameTarget.id, name)
    if (renamed) setRenameTarget(null)
  }

  function requestExampleEdit(edit: () => void) {
    if (theme.presetId || exampleEditDecision !== "unset") {
      edit()
      return
    }
    setPendingExampleEdit(() => edit)
    setCreateThemeDialogOpen(true)
  }

  function decideExampleEdit(shouldCreate: boolean) {
    setExampleEditDecision(shouldCreate ? "automatic" : "manual")
    setAutoCreateDraft(shouldCreate)
    setCreateThemeDialogOpen(false)
    const edit = pendingExampleEdit
    setPendingExampleEdit(null)
    edit?.()
  }

  function handleSelectPreset(name: string) {
    setAutoCreateDraft(false)
    setExampleEditDecision("unset")
    selectPreset(name)
  }

  function handleLoadSavedTheme(savedTheme: SavedTheme) {
    setAutoCreateDraft(false)
    setExampleEditDecision("unset")
    loadSavedTheme(savedTheme)
  }

  function handleResetTheme() {
    setAutoCreateDraft(false)
    setExampleEditDecision("unset")
    resetTheme()
  }

  async function handleCreateTheme(name: string) {
    const normalizedName = name.trim()
    if (saving) return false
    if (!normalizedName) {
      setNewThemeError("Informe um nome para o tema.")
      return false
    }
    setNewThemeError("")
    setExampleEditDecision("automatic")
    setAutoCreateDraft(true)
    selectPreset("Base")
    const created = await saveCurrentTheme(normalizedName)
    if (!created) setNewThemeError(themeError || "Não foi possível criar o tema.")
    return created
  }

  const showSaveThemeButton = exampleEditDecision === "manual" && dirty && !theme.presetId

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
          <div className="flex min-w-0 flex-1 items-center">
            <PlatformBreadcrumb current="Meus temas" />
            {dirty && (
              <span className="ml-2 hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary sm:inline">
                {saving ? "Salvando…" : "Rascunho"}
              </span>
            )}
          </div>
        </AppHeader>
      }
      mobileOpen={mobileNavigation}
      onMobileOpenChange={setMobileNavigation}
      sidebarLabel="Navegação principal"
      contentClassName="overflow-hidden"
    >
      <main className="mx-auto flex h-full min-h-0 w-full max-w-[1700px] flex-col gap-5 overflow-hidden px-5 py-6 sm:px-8 lg:px-10">
        <WorkAreaPageHeader
          title="Meus temas"
          description="Desenvolva identidades visuais reutilizáveis para seus projetos."
          action={(
            <>
              <CenterMorphModal
                open={createThemeDialogOpen}
                onOpenChange={(open) => {
                  setCreateThemeDialogOpen(open)
                  if (open) {
                    setNewThemeName("Meu tema")
                    setNewThemeError("")
                  }
                }}
              >
                <CenterMorphModalTrigger>
                  <Button className="w-full sm:w-auto" disabled={saving}>
                    <Plus data-icon="inline-start" aria-hidden="true" /> Novo tema
                  </Button>
                </CenterMorphModalTrigger>
                <CenterMorphModalContent
                  ariaLabel="Criar tema"
                  closeButtonLabel="Fechar"
                  dismissible={!saving}
                  showCloseButton={!saving}
                  className="dark builder-ui space-y-5 rounded-xl border-border bg-card p-5 text-foreground"
                  backdropClassName="bg-black/60"
                >
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault()
                      const created = await handleCreateTheme(newThemeName)
                      if (created) setCreateThemeDialogOpen(false)
                    }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="text-base font-semibold">Novo tema</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Dê um nome para identificar seu tema na biblioteca.
                      </p>
                    </div>
                    <Input
                      autoFocus
                      label="Nome do tema"
                      value={newThemeName}
                      onChange={setNewThemeName}
                      maxLength={80}
                      required
                      error={themeError || newThemeError || undefined}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() => setCreateThemeDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? "Criando…" : "Criar tema"}
                      </Button>
                    </div>
                  </form>
                </CenterMorphModalContent>
              </CenterMorphModal>
              {showSaveThemeButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void saveCurrentTheme()}
                  disabled={saving}
                >
                  <Save className="size-3.5" />
                  {saving ? "Salvando…" : "Salvar tema"}
                </Button>
              )}
              <div className="flex w-full rounded-lg border border-border p-1 md:hidden sm:w-auto">
                <Button
                  size="sm"
                  variant={mobilePanel === "editor" ? "secondary" : "ghost"}
                  onClick={() => setMobilePanel("editor")}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant={mobilePanel === "preview" ? "secondary" : "ghost"}
                  onClick={() => setMobilePanel("preview")}
                >
                  Prévia
                </Button>
              </div>
            </>
          )}
        />
        {themeError && (
          <p
            role="status"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"
          >
            {themeError}
          </p>
        )}
        <div className="grid min-h-0 min-w-0 flex-1 gap-5 xl:grid-cols-[minmax(350px,0.78fr)_minmax(0,1.42fr)]">
          <div className={`min-h-0 min-w-0 ${mobilePanel === "preview" ? "hidden md:block" : ""}`}>
            <ThemeEditorPanel
              theme={theme}
              dirty={dirty}
              onUpdate={(changes) => requestExampleEdit(() => updateTheme(changes))}
              onColorChange={(key, value) => requestExampleEdit(() => setColor(key, value))}
              onSelectPreset={handleSelectPreset}
              savedThemes={savedThemes}
              loadingThemes={loadingThemes}
              hasMoreThemes={hasMoreThemes}
              loadingMoreThemes={loadingMoreThemes}
              onLoadMoreThemes={() => void loadMoreThemes()}
              onLoadSavedTheme={handleLoadSavedTheme}
              saving={saving}
              onRequestDeleteTheme={setDeleteTarget}
              onRequestRenameTheme={setRenameTarget}
              onReset={handleResetTheme}
            />
          </div>
          <div className={`min-h-0 min-w-0 ${mobilePanel === "editor" ? "hidden md:block" : ""}`}>
            <ThemePreviewPanel
              theme={theme}
              preview={preview}
              onPreviewChange={setPreview}
            />
          </div>
        </div>
      </main>
      <ThemeDeleteDialog
        deleteTarget={deleteTarget}
        deleting={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onDelete={() => void handleDelete()}
      />
      <ThemeRenameDialog
        key={`${renameTarget?.id ?? "closed"}:${renameTarget?.name ?? ""}`}
        theme={renameTarget}
        saving={saving}
        error={themeError}
        onClose={() => {
          if (!saving) setRenameTarget(null)
        }}
        onRename={(name) => void handleRename(name)}
      />
      <Dialog
        open={createThemeDialogOpen}
        onOpenChange={(open) => {
          if (!open && createThemeDialogOpen) decideExampleEdit(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar um tema pessoal?</DialogTitle>
            <DialogDescription>
              Ao editar este exemplo, você pode criar um tema pessoal que será
              salvo automaticamente enquanto continua ajustando as cores e as
              demais variáveis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => decideExampleEdit(false)}>
              Continuar sem criar
            </Button>
            <Button onClick={() => decideExampleEdit(true)}>
              Criar tema pessoal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
