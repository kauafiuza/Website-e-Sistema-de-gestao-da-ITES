import { useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  ChevronDown,
  FileText,
  LogIn,
  LogOut,
  PanelsTopLeft,
  Globe2,
  ClipboardCheck,
  Palette,
  Settings2,
  UsersRound,
  ScrollText,
  X,
} from "lucide-react"
import { useAuth } from "@/context/auth/auth.context"
import { webPaths } from "@/router/helpers/route-paths"
import brand from "@/assets/brand/ites-mark.svg"
import { Button } from "@/components/ui/button"
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  children?: ReactNode
  collapsed?: boolean
  onClose: () => void
  section?: "navigation" | "editor"
}

const items = [
  {
    id: "projects",
    label: "Meus projetos",
    to: webPaths.projects,
    icon: PanelsTopLeft,
  },
  { id: "themes", label: "Meus temas", to: webPaths.themes, icon: Palette },
  { id: "publications", label: "Minhas publicações", to: webPaths.publications, icon: Globe2 },
  { id: "reviews", label: "Revisões", to: webPaths.publicationReviewInbox, icon: ClipboardCheck },
  { id: "organization", label: "Membros e permissões", to: webPaths.organizationMembers, icon: UsersRound },
  { id: "audit", label: "Trilha de auditoria", to: webPaths.organizationAudit, icon: ScrollText },
] as const

export function AppSidebar({
  children,
  collapsed = false,
  onClose,
  section = "navigation",
}: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, ready, logout } = useAuth()
  const [accountError, setAccountError] = useState("")
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const active =
    location.pathname === webPaths.projects
      ? "projects"
      : location.pathname === webPaths.themes
        ? "themes"
        : location.pathname === webPaths.publications || location.pathname.startsWith(`${webPaths.publications}/`)
          ? "publications"
        : location.pathname === webPaths.publicationReviewInbox
          ? "reviews"
        : location.pathname === webPaths.organizationMembers
          ? "organization"
        : location.pathname === webPaths.organizationAudit
          ? "audit"
        : location.pathname === webPaths.editor
          ? new URLSearchParams(location.search).get("catalog") === "pages"
            ? "templates"
            : "blocks"
          : null
  return (
    <aside
      aria-label="Navegação principal"
      data-collapsed={collapsed}
      className={cn(
        "builder-ui glass-subtle flex h-full shrink-0 flex-col overflow-hidden border-r bg-card transition-[width] duration-200 motion-reduce:transition-none max-md:w-full",
        collapsed ? "w-16" : "w-[320px]"
      )}
    >
      <div
        className="flex h-16 shrink-0 items-center gap-2 border-b px-3"
        translate="no"
      >
        <span className="builder-brand-badge flex size-9 shrink-0 items-center justify-center rounded-full">
          <img src={brand} alt="" width={24} height={24} className="size-6" />
        </span>
        {!collapsed ? (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
            <span className="font-semibold tracking-wide">ITES</span>
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto md:hidden"
          aria-label="Fechar navegação"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {section === "navigation" ? (
        <nav
          className="flex min-h-0 flex-1 flex-col gap-1 p-3"
          aria-label="Seções do editor"
        >
          {items.map(({ id, label, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              aria-current={active === id ? "page" : undefined}
              onClick={onClose}
              className={cn(
                "relative flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                collapsed && "justify-center px-0",
                active === id &&
                  "bg-sidebar-accent font-medium text-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
              )}
            >
              <Icon size={18} aria-hidden="true" />
              <span className={collapsed ? "sr-only" : "truncate"}>
                {label}
              </span>
            </Link>
          ))}
        </nav>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      )}
      <div className="shrink-0 border-t p-3">
        {!ready ? (
          <PageLoader
            layout="inline"
            label="Carregando conta"
            className="min-h-10 w-full justify-start px-2"
          />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="w-full rounded-lg text-left hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Menu da conta"
            >
              <span className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground"
                  aria-hidden="true"
                >
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </span>
                {!collapsed ? (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                ) : null}
                {!collapsed ? (
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : null}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="min-w-56">
              <DropdownMenuGroup>
                {section === "editor" ? (
                  <DropdownMenuItem
                    render={<Link to={webPaths.projects} onClick={onClose} />}
                  >
                    <FileText aria-hidden="true" /> Meus projetos
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  render={
                    <Link to={webPaths.accountSettings} onClick={onClose} />
                  }
                >
                  <Settings2 aria-hidden="true" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                  <LogOut aria-hidden="true" /> Sair da conta
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="secondary"
            className="w-full justify-start"
            render={<Link to={webPaths.auth} />}
          >
            <LogIn aria-hidden="true" /> Entrar ou criar conta
          </Button>
        )}
        {accountError ? (
          <p role="alert" className="px-2 text-xs text-destructive">
            {accountError}
          </p>
        ) : null}
      </div>
      <CenterMorphModal
        open={logoutOpen}
        onOpenChange={(open) => {
          if (!logoutPending) setLogoutOpen(open)
        }}
      >
        <CenterMorphModalContent
          ariaLabel="Confirmar saída da conta"
          closeButtonLabel="Fechar confirmação"
          className="builder-ui space-y-5 border-border bg-card p-6 text-foreground"
          backdropClassName="bg-black/60"
        >
          <div>
            <h2 className="text-lg font-semibold">Sair da plataforma?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você precisará entrar novamente para acessar sua conta.
            </p>
          </div>
          {accountError ? (
            <p role="alert" className="text-sm text-destructive">
              {accountError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={logoutPending}
              onClick={() => setLogoutOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={logoutPending}
              onClick={async () => {
                setLogoutPending(true)
                setAccountError("")
                try {
                  await logout()
                  setLogoutOpen(false)
                  navigate(webPaths.auth)
                } catch {
                  setAccountError("Não foi possível sair. Tente novamente.")
                } finally {
                  setLogoutPending(false)
                }
              }}
            >
              {logoutPending ? "Saindo…" : "Sair da conta"}
            </Button>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
    </aside>
  )
}
