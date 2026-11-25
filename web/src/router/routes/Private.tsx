import { useAuth } from "@/context/auth/auth.context"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { webPaths } from "../helpers/route-paths"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import { OrganizationProvider } from "@/context/organization/organization.context"

/**
 * Protege rotas que exigem autenticação.
 *
 * Controla o acesso de acordo com o estado da sessão:
 * - Aguarda a inicialização do contexto de autenticação.
 * - Redireciona usuários não autenticados para o login.
 * - Renderiza a rota solicitada quando existe um usuário autenticado.
 *
 * Preserva a localização original no estado `from`, permitindo
 * que o fluxo de login recupere a rota solicitada posteriormente.
 */
export default function Private() {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <PageLoader />
    )
  }

  if (!user) {
    return (
      <Navigate
        to={webPaths.login}
        state={{ from: location }}
        replace
      />
    )
  }

  return <OrganizationProvider><Outlet /></OrganizationProvider>
}
