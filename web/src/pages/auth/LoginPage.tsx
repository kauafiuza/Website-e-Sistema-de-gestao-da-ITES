import { useRef, useState, type FormEvent } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom"
import { ArrowRight, Mail } from "lucide-react"
import { Input } from "@/components/motion/input"
import { useAuth } from "@/context/auth/auth.context"
import { returnPath, webPaths } from "@/router/helpers/route-paths"
import {
  AuthRequestError,
  isTwoFactorChallenge,
} from "@/services/auth/auth.service"
import { AuthShell } from "./components/AuthShell"
import { PasswordInput } from "./components/PasswordInput"
import { SubmitButton } from "./components/SubmitButton"
import { TwoFactorForm } from "./components/TwoFactorForm"
import { errorMessage, normalizeEmail, validEmail } from "./lib/validation"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { login, loginTwoFactor } = useAuth()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [challenge, setChallenge] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const addingAccount = params.get("addAccount") === "1"
  const destination = returnPath(location.state)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submittedEmail = emailRef.current?.value ?? ""
    const submittedPassword = passwordRef.current?.value ?? ""
    if (!validEmail(submittedEmail)) {
      setError("Informe um e-mail válido.")
      emailRef.current?.focus()
      return
    }
    if (!submittedPassword) {
      setError("Digite sua senha.")
      passwordRef.current?.focus()
      return
    }
    setPending(true)
    setError("")
    try {
      const result = await login(normalizeEmail(submittedEmail), submittedPassword)
      if (isTwoFactorChallenge(result)) {
        setChallenge(result.challenge)
        return
      }
      navigate(destination, { replace: true })
    } catch (cause) {
      setError(
        cause instanceof AuthRequestError && cause.status === 401
          ? "E-mail ou senha incorretos. Tente novamente ou redefina sua senha."
          : errorMessage(cause, "Não foi possível entrar. Tente novamente.")
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      title={challenge ? "Confirme seu acesso" : "Entrar"}
      footer={
        <>
          Precisa de acesso?{" "}
          <Link
            to={`${webPaths.signup}${addingAccount ? "?addAccount=1" : ""}`}
            className="font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Solicitar acesso
          </Link>
        </>
      }
    >
      {addingAccount ? (
        <p className="mb-5 rounded-lg bg-primary/10 p-3 text-sm text-foreground">
          A nova conta será adicionada a este navegador.
        </p>
      ) : null}
      {challenge ? (
        <TwoFactorForm
          verify={async (proof) => {
            await loginTwoFactor(challenge, proof)
            navigate(destination, { replace: true })
          }}
          onLost={() => {
            setChallenge("")
            setError("A verificação expirou. Digite sua senha novamente.")
          }}
          onBack={() => setChallenge("")}
        />
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input
            ref={emailRef}
            label="E-mail"
            error={error === "Informe um e-mail válido." ? error : undefined}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            spellCheck={false}
            defaultValue={email}
            onChange={(value) => {
              setEmail(value)
              setError("")
            }}
            leftIcon={<Mail aria-hidden="true" />}
            placeholder="seuemail@exemplo.com…"
          />
          <PasswordInput
            ref={passwordRef}
            label="Senha"
            error={error === "Digite sua senha." ? error : undefined}
            name="password"
            autoComplete="current-password"
            onChange={() => setError("")}
          />
          <div className="text-right leading-none">
            <Link
              to={`${webPaths.forgotPassword}?email=${encodeURIComponent(email.trim())}`}
              className="text-sm font-medium text-[#9baefb] hover:text-[#c0cbff] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Esqueci minha senha
            </Link>
          </div>
          {error && error !== "Informe um e-mail válido." && error !== "Digite sua senha." ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <SubmitButton pending={pending} icon={<ArrowRight className="size-4" aria-hidden="true" />}>Entrar</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
