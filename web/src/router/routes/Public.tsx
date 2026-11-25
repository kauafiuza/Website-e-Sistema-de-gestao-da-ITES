import { useAuth } from "@/context/auth/auth.context"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { returnPath, webPaths } from "../helpers/route-paths"
import { PageLoader } from "@/pages/auxiliary/PageLoader"

/**
 * Controla o acesso às rotas públicas da aplicação.
 *
 * Regras de acesso:
 * - Aguarda a inicialização da sessão.
 * - Permite acesso a usuários não autenticados.
 * - Preserva fluxos de confirmação e recuperação por link.
 * - Permite adicionar outra conta através de `addAccount=1`.
 * - Redireciona usuários autenticados para a rota de retorno.
 */
export default function Public() {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <PageLoader />
    )
  }

  const isLinkFlow = [
    webPaths.signupConfirm,
    webPaths.resetPassword,
    webPaths.emailConfirm,
  ].some((path) => path === location.pathname)

  const isAddingAccount =
    new URLSearchParams(location.search).get("addAccount") === "1"

  if (user && !isLinkFlow && !isAddingAccount) {
    return <Navigate to={returnPath(location.state)} replace />
  }

  return <Outlet />
}
