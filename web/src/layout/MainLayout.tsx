import type { ReactNode } from "react"
import { ArrowLeft, Boxes, PanelLeft } from "lucide-react"
import { PlatformThemeToggle } from "./PlatformThemeToggle"
import { useOrganization } from "@/context/organization/organization.context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"

interface MainLayoutProps {
  sidebar: ReactNode
  mobileSidebar: ReactNode
  header: ReactNode
  children: ReactNode
  rightSidebar?: ReactNode
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  showSidebar?: boolean
  sidebarLabel: string
  className?: string
  contentClassName?: string
  contentId?: string
}

/** Shared workspace frame. Each page supplies its own navigation and actions. */
export function MainLayout({
  sidebar,
  mobileSidebar,
  header,
  children,
  rightSidebar,
  mobileOpen,
  onMobileOpenChange,
  showSidebar = true,
  sidebarLabel,
  className = "",
  contentClassName = "",
  contentId,
}: MainLayoutProps) {
  const isMobile = useIsMobile()
  return (
    <div
      className={`builder-workspace flex h-svh overflow-hidden bg-background text-foreground ${className}`}
    >
      {showSidebar ? (
        <div className="hidden h-full shrink-0 md:block">{sidebar}</div>
      ) : null}
      <Sheet
        open={showSidebar && isMobile && mobileOpen}
        onOpenChange={onMobileOpenChange}
      >
        <SheetContent
          side="left"
          showCloseButton={false}
          className="builder-ui glass-elevated w-[280px]! p-0"
        >
          <SheetTitle className="sr-only">{sidebarLabel}</SheetTitle>
          <SheetDescription className="sr-only">
            Navegação e ferramentas da plataforma.
          </SheetDescription>
          {mobileSidebar}
        </SheetContent>
      </Sheet>
      <div className="builder-editor-stage flex min-w-0 flex-1 flex-col">
        {header}
        <div id={contentId} className={`min-h-0 flex-1 ${contentClassName}`}>{children}</div>
      </div>
      {rightSidebar}
    </div>
  )
}

export function AppHeader({
  children,
  onToggleSidebar,
  sidebarCollapsed = false,
  back = false,
  className = "",
  showPlatformThemeToggle = false,
}: {
  children: ReactNode
  onToggleSidebar: () => void
  sidebarCollapsed?: boolean
  back?: boolean
  className?: string
  showPlatformThemeToggle?: boolean
}) {
  const isMobile = useIsMobile()
  const { organizations, selectedOrganization, notice, selectOrganization,
    features, featureState, retryFeatures } = useOrganization()
  const unavailableFeatures = features.filter((feature) => !feature.enabled).length
  return (
    <header
      className={`builder-ui flex h-16 shrink-0 items-center gap-1 border-b border-border px-2 max-sm:gap-0.5 max-sm:px-1.5 ${className}`}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={
          back
            ? "Voltar ao editor"
            : isMobile
              ? "Abrir navegação"
              : sidebarCollapsed
                ? "Expandir barra lateral"
                : "Recolher barra lateral"
        }
        onClick={onToggleSidebar}
      >
        {back ? (
          <ArrowLeft aria-hidden="true" />
        ) : (
          <PanelLeft aria-hidden="true" />
        )}
      </Button>
      {children}
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <label htmlFor="active-organization" className="sr-only">Organização ativa</label>
        <select
          id="active-organization"
          aria-label="Organização ativa"
          aria-describedby={notice ? "organization-selection-notice" : undefined}
          value={selectedOrganization?.id ?? ""}
          onChange={(event) => selectOrganization(event.currentTarget.value)}
          className="builder-ui h-9 max-w-[clamp(7rem,24vw,14rem)] truncate rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
          ))}
        </select>
        {notice ? <span id="organization-selection-notice" role="status" title={notice} className="max-w-28 truncate text-xs text-amber-700 dark:text-amber-300">Organização atualizada</span> : null}
        <Popover>
          <PopoverTrigger>
            <Button type="button" variant="ghost" size="sm" aria-label="Disponibilidade dos recursos da organização">
              <Boxes aria-hidden="true" />
              <span className="hidden sm:inline">Recursos</span>
              {unavailableFeatures > 0 ? <Badge variant="outline" className="h-5 px-1.5">{unavailableFeatures} {unavailableFeatures === 1 ? "indisponível" : "indisponíveis"}</Badge> : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="builder-ui glass-frosted max-h-[min(70vh,32rem)] w-80 overflow-y-auto">
            <PopoverHeader>
              <PopoverTitle>Recursos da organização</PopoverTitle>
              <PopoverDescription>
                A disponibilidade é definida para esta organização. Cada operação também exige as permissões da sua conta.
              </PopoverDescription>
            </PopoverHeader>
            {featureState === "loading" ? <p role="status" className="text-muted-foreground">Carregando disponibilidade…</p> : null}
            {featureState === "error" ? (
              <div role="alert" className="space-y-2">
                <p>Não foi possível consultar a disponibilidade dos recursos.</p>
                <Button type="button" variant="outline" size="sm" onClick={retryFeatures}>Tentar novamente</Button>
              </div>
            ) : null}
            {featureState === "ready" ? (
              features.length ? <ul className="space-y-2">
                {features.map((feature) => (
                  <li key={`${feature.featureKey}:${feature.version}`} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
                    <span className="min-w-0">
                      <span className="block font-medium">{feature.name}</span>
                      <span className="block text-xs text-muted-foreground">{feature.description}</span>
                    </span>
                    <Badge variant={feature.enabled ? "secondary" : "outline"} className="shrink-0">
                      {feature.enabled ? "Disponível" : "Indisponível"}
                    </Badge>
                  </li>
                ))}
              </ul> : <p role="status" className="text-muted-foreground">Nenhum recurso está cadastrado.</p>
            ) : null}
            {featureState === "ready" && unavailableFeatures > 0 ? (
              <p className="text-xs text-muted-foreground">
                Os recursos indisponíveis não podem ser usados nesta organização.
              </p>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
      {showPlatformThemeToggle ? (
        <div className="shrink-0">
          <PlatformThemeToggle />
        </div>
      ) : null}
    </header>
  )
}
