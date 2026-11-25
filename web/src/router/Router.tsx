import { lazy, Suspense } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth/auth.context"

import Private from "./routes/Private"
import Public from "./routes/Public"
import { webPaths } from "./helpers/route-paths"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import { NotFoundPage } from "@/pages/auxiliary/NotFoundPage"

// ─── Páginas públicas ────────────────────────────────────────────────────────

const InstitutionalPage = lazy(() => import("@/pages/ites/InstitutionalPage"))
const PortalPage = lazy(() => import("@/pages/ites/PortalPage"))
const GrantsPage = lazy(() => import("@/pages/ites/GrantsPage"))
const AdminDemandsPage = lazy(() => import("@/pages/ites/AdminDemandsPage"))
const DemandAnalyticsPage = lazy(() => import("@/pages/ites/DemandAnalyticsPage"))
const DemandsPage = lazy(() => import("@/pages/ites/DemandsPage"))
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"))
const SignupPage = lazy(() => import("@/pages/auth/SignupPage"))
const SignupConfirmPage = lazy(
  () => import("@/pages/auth/SignupConfirmPage"),
)
const ForgotPasswordPage = lazy(
  () => import("@/pages/auth/ForgotPasswordPage"),
)
const ResetPasswordPage = lazy(
  () => import("@/pages/auth/ResetPasswordPage"),
)
const EmailConfirmPage = lazy(
  () => import("@/pages/auth/EmailConfirmPage"),
)

// ─── Páginas privadas ────────────────────────────────────────────────────────

const AccountSecurityPage = lazy(
  () => import("@/pages/auth/AccountSecurityPage"),
)
const ProjectsPage = lazy(
  () => import("@/pages/projects/ProjectsPage"),
)
const ThemeLabPage = lazy(() => import("@/pages/themes/ThemeLabPage"))
const BuilderPage = lazy(
  () => import("@/pages/editor/BuilderPage"),
)
const PreviewPage = lazy(
  () => import("@/pages/editor/PreviewPage"),
)
const PublicationsPage = lazy(() => import("@/pages/publications/PublicationsPage"))
const PublicationDetailsPage = lazy(() => import("@/pages/publications/PublicationDetailsPage"))
const PublicationReviewInboxPage = lazy(() => import("@/pages/publications/PublicationReviewInboxPage"))
const PublicSitePage = lazy(() => import("@/pages/publications/PublicSitePage"))
const OrganizationMembersPage = lazy(() => import("@/pages/organizations/OrganizationMembersPage"))
const OrganizationAuditPage = lazy(() => import("@/pages/organizations/OrganizationAuditPage"))
const AcceptOrganizationInvitationPage = lazy(() => import("@/pages/organizations/AcceptOrganizationInvitationPage"))

/**
 * Define as rotas públicas, privadas e os redirecionamentos da aplicação.
 *
 * As páginas são carregadas sob demanda, com mensagens específicas
 * para o editor e a visualização prévia.
 */
function RouteProviders({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  if (pathname.startsWith("/p/")) return children
  return <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
}

function AppRoutes() {
  const defaultFallback = <PageLoader />
  const editorFallback = <PageLoader />
  const previewFallback = <PageLoader />

  return (
      <Suspense fallback={defaultFallback}>
        <Routes>
          <Route path="/p/:key/*" element={<PublicSitePage />} />
          <Route path="/" element={<PortalPage />} />
          <Route path="/institucional/:slug" element={<InstitutionalPage />} />
          <Route path={webPaths.acceptOrganizationInvitation} element={<AcceptOrganizationInvitationPage />} />
          {/* ── Rotas públicas ────────────────────────────────────────── */}

          <Route element={<Public />}>
            <Route path={webPaths.auth} element={<LoginPage />} />
            <Route path={webPaths.login} element={<LoginPage />} />
            <Route path={webPaths.signup} element={<SignupPage />} />
            <Route
              path={webPaths.signupConfirm}
              element={<SignupConfirmPage />}
            />
            <Route
              path={webPaths.forgotPassword}
              element={<ForgotPasswordPage />}
            />
            <Route
              path={webPaths.resetPassword}
              element={<ResetPasswordPage />}
            />
            <Route
              path={webPaths.emailConfirm}
              element={<EmailConfirmPage />}
            />
          </Route>

          {/* ── Rotas privadas ────────────────────────────────────────── */}

          <Route element={<Private />}>
            <Route path="/demandas" element={<DemandsPage />} />
            <Route path="/administracao/editor" element={<Navigate to={webPaths.projects} replace />} />
            <Route path="/administracao/demandas" element={<AdminDemandsPage />} />
            <Route path="/administracao/indicadores" element={<DemandAnalyticsPage />} />
            <Route path="/administracao/permissoes" element={<GrantsPage />} />
            <Route
              path={webPaths.accountSettings}
              element={<AccountSecurityPage />}
            />
            <Route
              path="/conta/seguranca"
              element={<Navigate to={webPaths.accountSettings} replace />}
            />
            <Route
              path={webPaths.projects}
              element={<ProjectsPage />}
            />
            <Route path={webPaths.themes} element={<ThemeLabPage />} />
            <Route path={webPaths.publications} element={<PublicationsPage />} />
            <Route path={webPaths.publicationReviewInbox} element={<PublicationReviewInboxPage />} />
            <Route path={webPaths.publicationDetails} element={<PublicationDetailsPage />} />
            <Route path={webPaths.organizationMembers} element={<OrganizationMembersPage />} />
            <Route path={webPaths.organizationAudit} element={<OrganizationAuditPage />} />
            <Route
              path={webPaths.editor}
              element={
                <Suspense fallback={editorFallback}>
                  <BuilderPage />
                </Suspense>
              }
            />
            <Route
              path="/editor/:projectId"
              element={
                <Suspense fallback={editorFallback}>
                  <BuilderPage />
                </Suspense>
              }
            />
            <Route
              path={webPaths.preview}
              element={
                <Suspense fallback={previewFallback}>
                  <PreviewPage />
                </Suspense>
              }
            />
            <Route
              path={`${webPaths.preview}/*`}
              element={
                <Suspense fallback={previewFallback}>
                  <PreviewPage />
                </Suspense>
              }
            />
          </Route>

          {/* ── Rotas auxiliares ──────────────────────────────────────── */}


          <Route path="*" element={<NotFoundPage/>} />
        </Routes>
      </Suspense>
  )
}

export default function Router() {
  return <BrowserRouter><RouteProviders><AppRoutes /></RouteProviders></BrowserRouter>
}
