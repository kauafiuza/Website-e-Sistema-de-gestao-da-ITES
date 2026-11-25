import { useEffect, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Mail, MailCheck, RotateCw } from "lucide-react"
import { Input } from "@/components/motion/input"
import { Button } from "@/components/ui/button"
import { authApi } from "@/services/auth/auth.service"
import { webPaths } from "@/router/helpers/route-paths"
import { AuthShell } from "./components/AuthShell"
import { SubmitButton } from "./components/SubmitButton"
import { errorMessage, normalizeEmail, validEmail } from "./lib/validation"

export default function SignupPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)
  const [availableAt, setAvailableAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [emailSignupEnabled, setEmailSignupEnabled] = useState<boolean | null>(null)
  const seconds = Math.max(0, Math.ceil((availableAt - now) / 1000))

  useEffect(() => {
    fetch("/api/public/auth/config")
      .then(response => response.ok ? response.json() as Promise<{ emailSignupEnabled: boolean }> : null)
      .then(config => setEmailSignupEnabled(config?.emailSignupEnabled ?? false))
      .catch(() => setEmailSignupEnabled(false))
  }, [])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validEmail(email)) return setError("Informe um e-mail válido.")
    setPending(true)
    setError("")
    try {
      const result = await authApi.signupStart(normalizeEmail(email))
      setAvailableAt(
        Date.parse(result.resendAvailableAt) || Date.now() + 60_000
      )
      setSent(true)
    } catch (cause) {
      setError(
        errorMessage(cause, "Não foi possível enviar o link. Tente novamente.")
      )
    } finally {
      setPending(false)
    }
  }

  async function resend() {
    setResending(true)
    setError("")
    try {
      const result = await authApi.signupResend(normalizeEmail(email))
      setAvailableAt(
        Date.parse(result.resendAvailableAt) || Date.now() + 60_000
      )
    } catch (cause) {
      setError(errorMessage(cause, "Não foi possível reenviar o link."))
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    if (!sent || availableAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [sent, availableAt])

  if (emailSignupEnabled !== true) {
    return (
      <AuthShell
        eyebrow="Acesso à plataforma"
        title="Solicite seu acesso"
        description="Neste momento, a equipe da ITES cria as contas diretamente. Entre em contato com a administração para receber suas credenciais."
        footer={<>Já recebeu suas credenciais? <Link to={webPaths.login} className="font-semibold text-primary hover:underline">Entrar</Link></>}
      >
        <p className="rounded-lg bg-primary/10 p-4 text-sm text-foreground">
          Não é necessário confirmar o cadastro por e-mail. A equipe informará quando sua conta estiver disponível.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Comece por aqui"
      title={sent ? "Confira seu e-mail" : "Crie sua conta"}
      description={
        sent ? (
          <>
            Enviamos um link para{" "}
            <strong className="break-all text-foreground">
              {normalizeEmail(email)}
            </strong>
            . Abra o link para concluir o cadastro.
          </>
        ) : (
          "Informe seu e-mail e enviaremos um link para você começar."
        )
      }
      footer={
        <>
          Já tem uma conta?{" "}
          <Link
            to={`${webPaths.login}${params.get("addAccount") === "1" ? "?addAccount=1" : ""}`}
            className="font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Entrar
          </Link>
        </>
      }
    >
      {params.get("addAccount") === "1" ? (
        <p className="mb-5 rounded-lg bg-primary/10 p-3 text-sm text-foreground">
          A nova conta será adicionada a este navegador.
        </p>
      ) : null}
      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck
            className="mx-auto size-11 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            O link vale por 30 minutos. Confira também a pasta de spam.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={seconds > 0 || resending}
            onClick={resend}
          >
            <RotateCw
              className={resending ? "animate-spin" : ""}
              aria-hidden="true"
            />{" "}
            {seconds > 0 ? `Reenviar em ${seconds}s` : "Reenviar link"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setSent(false)
              setError("")
            }}
          >
            Usar outro e-mail
          </Button>
        </div>
      ) : (
        <form onSubmit={send} noValidate>
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
            className="mb-6"
          />
          <SubmitButton pending={pending}>Enviar link de cadastro</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
