import { useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Mail, MailCheck } from "lucide-react"
import { Input } from "@/components/motion/input"
import { Button } from "@/components/ui/button"
import { webPaths } from "@/router/helpers/route-paths"
import { authApi } from "@/services/auth/auth.service"
import { AuthShell } from "./components/AuthShell"
import { SubmitButton } from "./components/SubmitButton"
import { errorMessage, normalizeEmail, validEmail } from "./lib/validation"

export default function ForgotPasswordPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validEmail(email)) return setError("Informe um e-mail válido.")
    setPending(true)
    setError("")
    try {
      await authApi.forgotPassword(normalizeEmail(email))
      setSent(true)
    } catch (cause) {
      setError(
        errorMessage(cause, "Não foi possível enviar o link. Tente novamente.")
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Recuperação de acesso"
      title={sent ? "Confira seu e-mail" : "Esqueceu sua senha?"}
      description={
        sent ? (
          <>
            Se existir uma conta para{" "}
            <strong className="break-all text-foreground">
              {normalizeEmail(email)}
            </strong>
            , você receberá um link para redefinir a senha.
          </>
        ) : (
          "Informe o e-mail da conta e enviaremos um link para criar uma nova senha."
        )
      }
      footer={
        <>
          Lembrou sua senha?{" "}
          <Link
            to={webPaths.login}
            className="font-semibold text-primary hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck
            className="mx-auto size-11 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            O link vale por 30 minutos. Confira também a pasta de spam.
          </p>
          <Button type="button" variant="ghost" onClick={() => setSent(false)}>
            Usar outro e-mail
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Input
            label="E-mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(value) => {
              setEmail(value)
              setError("")
            }}
            leftIcon={<Mail aria-hidden="true" />}
            error={error}
            placeholder="Ex.: voce@exemplo.com"
          />
          <SubmitButton pending={pending}>
            Enviar link de recuperação
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
