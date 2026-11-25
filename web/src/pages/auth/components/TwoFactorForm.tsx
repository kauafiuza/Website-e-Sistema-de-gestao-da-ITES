import { useState, type FormEvent } from "react"
import { KeyRound } from "lucide-react"
import { Input } from "@/components/motion/input"
import { OTPInput } from "@/components/motion/otp-input"
import { Button } from "@/components/ui/button"
import { AuthRequestError } from "@/services/auth/auth.service"
import { errorMessage } from "../lib/validation"
import { SubmitButton } from "./SubmitButton"

const LOST = new Set([
  "TWO_FACTOR_CHALLENGE_INVALID",
  "TWO_FACTOR_CHALLENGE_EXPIRED",
  "TWO_FACTOR_TOO_MANY_ATTEMPTS",
])

export function TwoFactorForm({
  verify,
  onLost,
  onBack,
}: {
  verify: (proof: { code: string } | { recoveryCode: string }) => Promise<void>
  onLost: () => void
  onBack: () => void
}) {
  const [mode, setMode] = useState<"totp" | "recovery">("totp")
  const [code, setCode] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const proof =
      mode === "totp" ? { code } : { recoveryCode: recoveryCode.trim() }
    if (mode === "totp" && !/^\d{6}$/.test(code))
      return setError("Digite os 6 dígitos do aplicativo autenticador.")
    if (mode === "recovery" && !recoveryCode.trim())
      return setError("Digite um código de recuperação.")
    setPending(true)
    setError("")
    try {
      await verify(proof)
    } catch (cause) {
      if (
        cause instanceof AuthRequestError &&
        cause.code &&
        LOST.has(cause.code)
      )
        return onLost()
      setCode("")
      setError(
        errorMessage(cause, "Código inválido. Confira e tente novamente.")
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-lg font-semibold">Verificação em duas etapas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "totp"
            ? "Digite o código do aplicativo autenticador."
            : "Use um dos códigos de recuperação que você guardou."}
        </p>
      </div>
      {mode === "totp" ? (
        <OTPInput
          label="Código de verificação"
          value={code}
          onChange={(value) => {
            setCode(value)
            setError("")
          }}
          length={6}
          status={error ? "error" : "idle"}
          errorMessage={error || undefined}
          className="max-w-full overflow-x-auto [&_fieldset>div>div]:w-9 sm:[&_fieldset>div>div]:w-12"
          aria-label="Código de verificação"
        />
      ) : (
        <Input
          label="Código de recuperação"
          name="recoveryCode"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          value={recoveryCode}
          onChange={(value) => {
            setRecoveryCode(value)
            setError("")
          }}
          leftIcon={<KeyRound aria-hidden="true" />}
          error={error}
          placeholder="Ex.: abcd-1234"
        />
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setMode((value) => (value === "totp" ? "recovery" : "totp"))
          setError("")
        }}
        className="text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {mode === "totp"
          ? "Usar código de recuperação"
          : "Usar aplicativo autenticador"}
      </Button>
      <SubmitButton pending={pending}>Verificar código</SubmitButton>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onBack}
        disabled={pending}
      >
        Voltar
      </Button>
    </form>
  )
}
