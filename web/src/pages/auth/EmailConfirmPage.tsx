import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { webPaths } from "@/router/helpers/route-paths"
import { useAuth } from "@/context/auth/auth.context"
import { authApi } from "@/services/auth/auth.service"
import { AuthShell } from "./components/AuthShell"
import { PageLoader } from "@/pages/auxiliary/PageLoader"

export default function EmailConfirmPage() {
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const { clearSession } = useAuth()
  const [status, setStatus] = useState<"checking" | "confirmed" | "invalid">(
    () => (token ? "checking" : "invalid")
  )

  useEffect(() => {
    let active = true
    if (!token) return
    authApi
      .confirmEmail(token)
      .then(() => {
        if (active) {
          clearSession()
          setStatus("confirmed")
        }
      })
      .catch(() => {
        if (active) setStatus("invalid")
      })
    return () => {
      active = false
    }
  }, [token, clearSession])

  return (
    <AuthShell
      eyebrow="Confirmação de e-mail"
      title={
        status === "confirmed"
          ? "E-mail atualizado"
          : status === "invalid"
            ? "Não foi possível confirmar"
            : "Confirmando endereço"
      }
      description={
        status === "confirmed"
          ? "Seu novo e-mail está pronto para usar. Por segurança, entre novamente."
          : status === "invalid"
            ? "O link expirou ou já foi utilizado. Solicite outra alteração nas configurações da conta."
            : "Estamos validando seu link de confirmação."
      }
    >
      {status === "checking" ? (
        <PageLoader layout="content" label="Validando link de confirmação" />
      ) : (
        <div className="text-center">
          <Link
            to={
              status === "confirmed" ? webPaths.login : webPaths.accountSettings
            }
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {status === "confirmed"
              ? "Entrar novamente"
              : "Abrir segurança da conta"}
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
