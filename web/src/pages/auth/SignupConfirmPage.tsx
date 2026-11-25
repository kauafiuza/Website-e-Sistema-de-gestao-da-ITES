import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { UserRound } from "lucide-react"
import { Checkbox } from "@/components/motion/checkbox"
import { Input } from "@/components/motion/input"
import { useAuth } from "@/context/auth/auth.context"
import { webPaths } from "@/router/helpers/route-paths"
import { authApi, AuthRequestError } from "@/services/auth/auth.service"
import { AuthShell } from "./components/AuthShell"
import { PageLoader } from "@/pages/auxiliary/PageLoader"
import { PasswordInput } from "./components/PasswordInput"
import { SubmitButton } from "./components/SubmitButton"
import { errorMessage, passwordError } from "./lib/validation"

export default function SignupConfirmPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const { completeSignup } = useAuth()
  const [step, setStep] = useState<"checking" | "form" | "invalid">(() =>
    token ? "checking" : "invalid"
  )
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    if (!token) return
    authApi
      .signupVerify(token)
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
    if (!firstName.trim() || !lastName.trim())
      return setError("Informe seu nome e sobrenome.")
    const invalid = passwordError(password, email, [firstName, lastName])
    if (invalid) return setError(invalid)
    if (!terms) return setError("Aceite os termos para criar sua conta.")
    setPending(true)
    setError("")
    try {
      await completeSignup({
        token,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        acceptTerms: terms,
      })
      let invitationPath = ""
      try {
        const pending = localStorage.getItem("builder-pending-organization-invitation-v1") ?? ""
        if (pending.startsWith("/convite/aceitar?token=")) invitationPath = pending
        localStorage.removeItem("builder-pending-organization-invitation-v1")
      } catch { /* continuar para a rota padrão */ }
      navigate(invitationPath || webPaths.projects, { replace: true })
    } catch (cause) {
      if (
        cause instanceof AuthRequestError &&
        ["TOKEN_INVALID", "TOKEN_EXPIRED", "EMAIL_TAKEN"].includes(
          cause.code ?? ""
        )
      )
        setStep("invalid")
      else
        setError(
          errorMessage(
            cause,
            "Não foi possível criar a conta. Tente novamente."
          )
        )
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Confirmação de e-mail"
      title={
        step === "invalid"
          ? "Este link não está disponível"
          : "Sua conta começa aqui"
      }
      description={
        step === "form" ? (
          <>
            E-mail confirmado:{" "}
            <strong className="break-all text-foreground">{email}</strong>.
            Complete seus dados para começar.
          </>
        ) : (
          "O link de cadastro vale por 30 minutos e pode ser usado uma vez."
        )
      }
    >
      {step === "checking" ? (
        <PageLoader layout="content" label="Validando link de cadastro" />
      ) : null}
      {step === "invalid" ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Peça um novo link ou entre caso já tenha criado a conta.
          </p>
          <Link
            to={webPaths.signup}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Pedir novo link
          </Link>
          <p>
            <Link
              to={webPaths.login}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      ) : null}
      {step === "form" ? (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome"
              name="given-name"
              autoComplete="given-name"
              maxLength={80}
              value={firstName}
              onChange={(value) => {
                setFirstName(value)
                setError("")
              }}
              leftIcon={<UserRound aria-hidden="true" />}
            />
            <Input
              label="Sobrenome"
              name="family-name"
              autoComplete="family-name"
              maxLength={80}
              value={lastName}
              onChange={(value) => {
                setLastName(value)
                setError("")
              }}
            />
          </div>
          <PasswordInput
            label="Crie uma senha"
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(value) => {
              setPassword(value)
              setError("")
            }}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Use pelo menos 8 caracteres. Evite repetir o mesmo caractere ou
            incluir seu nome e e-mail.
          </p>
          <Checkbox
            checked={terms}
            onCheckedChange={(value) => {
              setTerms(value)
              setError("")
            }}
            label="Aceito os Termos de Uso e a Política de Privacidade."
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <SubmitButton pending={pending}>Criar conta</SubmitButton>
        </form>
      ) : null}
    </AuthShell>
  )
}
