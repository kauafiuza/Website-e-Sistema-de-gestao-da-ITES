import { useEffect, useState, type ReactNode } from "react"
import { AppSidebar } from "./PlatformSidebar"
import { AppHeader, MainLayout } from "./MainLayout"
import { PlatformBreadcrumb } from "./PlatformBreadcrumb"

export function AccountLayout({
  children,
  title,
  description,
}: {
  children: ReactNode
  title: string
  description: ReactNode
}) {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("builder-sidebar-collapsed") === "true"
  )
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => {
      setMobile(media.matches)
      setMobileOpen(false)
    }
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  function toggle() {
    if (mobile) {
      setMobileOpen((value) => !value)
      return
    }
    setCollapsed((value) => {
      localStorage.setItem("builder-sidebar-collapsed", String(!value))
      return !value
    })
  }
  return (
    <MainLayout
      sidebar={
        <AppSidebar
          collapsed={collapsed}
          onClose={() => setMobileOpen(false)}
        />
      }
      mobileSidebar={<AppSidebar onClose={() => setMobileOpen(false)} />}
      header={
        <AppHeader
          onToggleSidebar={toggle}
          sidebarCollapsed={collapsed}
          showPlatformThemeToggle
        >
          <PlatformBreadcrumb current={title} />
        </AppHeader>
      }
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      sidebarLabel="Navegação principal"
      contentClassName="overflow-y-auto"
      contentId="account-layout-scroll"
    >
      <a
        href="#account-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-background focus:p-3 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ir para o conteúdo
      </a>
      <main
        id="account-main"
        className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10"
      >
        <h1 className="text-3xl font-semibold text-pretty">{title}</h1>
        <p className="mt-2 text-pretty text-muted-foreground">{description}</p>
        <div className="mt-8">{children}</div>
      </main>
    </MainLayout>
  )
}
