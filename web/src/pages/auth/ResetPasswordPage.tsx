import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/auth/auth.context"
import { webPaths } from "@/router/helpers/route-paths"
import {
  authApi,
  AuthRequestError,
  isTwoFactorChallenge,
} from "@/services/auth/auth.service"
import { AuthShell } from "./components/AuthShell"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import { PasswordInput } from "./components/PasswordInput"
import { SubmitButton } from "./components/SubmitButton"
import { TwoFactorForm } from "./components/TwoFactorForm"
import { errorMessage, passwordError } from "./lib/validation"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const { resetPassword, loginTwoFactor } = useAuth()
  const [step, setStep] = useState<
    "checking" | "form" | "twoFactor" | "invalid"
  >(() => (token ? "checking" : "invalid"))
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [challenge, setChallenge] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    if (!token) return
    authApi
      .resetVerify(token)
      .then((result) => {
        if (active) {
          setEmail(result.email)
          setStep("form")
        }
      })
      .catch(() => {
        if (active) setStep("invalid")
      })
    return () => {
      active = false
    }
  }, [token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid = passwordError(password, email)
    if (invalid) return setError(invalid)
    setPending(true)
    setError("")
    try {
      const result = await resetPassword(token, password)
      if (isTwoFactorChallenge(result)) {
        setChallenge(result.challenge)
        setStep("twoFactor")
        return
      }
      navigate(webPaths.projects, { replace: true })
    } catch (cause) {
      if (
        cause instanceof AuthRequestError &&
        ["TOKEN_INVALID", "TOKEN_EXPIRED"].includes(cause.code ?? "")
      )
        setStep("invalid")
      else
        setError(
          errorMessage(
            cause,
            "Não foi possível redefinir a senha. Tente novamente."
          )
        )
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Recuperação de acesso"
      title={
        step === "invalid"
          ? "Este link expirou"
          : step === "twoFactor"
            ? "Confirme seu acesso"
            : "Crie uma nova senha"
      }
      description={
        step === "form" ? (
          <>
            Para <strong className="break-all text-foreground">{email}</strong>.
            Suas outras sessões serão encerradas.
          </>
        ) : step === "invalid" ? (
          "O link vale por 30 minutos e pode ser usado uma vez."
        ) : (
          "Proteja sua conta com uma nova senha."
        )
      }
    >
      {step === "checking" ? (
        <PageLoader layout="content" label="Validando link de redefinição" />
      ) : null}
      {step === "invalid" ? (
        <div className="text-center">
          <Link
            to={webPaths.forgotPassword}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Pedir novo link
          </Link>
        </div>
      ) : null}
      {step === "form" ? (
        <form onSubmit={submit} noValidate>
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          <PasswordInput
            label="Nova senha"
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(value) => {
              setPassword(value)
              setError("")
            }}
            error={error}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Use pelo menos 8 caracteres e evite incluir seu e-mail.
          </p>
          <SubmitButton pending={pending}>Salvar nova senha</SubmitButton>
        </form>
      ) : null}
      {step === "twoFactor" ? (
        <TwoFactorForm
          verify={async (proof) => {
            await loginTwoFactor(challenge, proof)
            navigate(webPaths.projects, { replace: true })
          }}
          onLost={() =>
            navigate(`${webPaths.login}?email=${encodeURIComponent(email)}`, {
              replace: true,
            })
          }
          onBack={() =>
            navigate(`${webPaths.login}?email=${encodeURIComponent(email)}`, {
              replace: true,
            })
          }
        />
      ) : null}
    </AuthShell>
  )
}
