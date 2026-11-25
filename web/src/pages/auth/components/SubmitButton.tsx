import type { ReactNode } from "react"
import { StatefulButton } from "@/components/motion/button/stateful"

export function SubmitButton({
  children,
  pending,
  disabled = false,
  icon,
}: {
  children: ReactNode
  pending: boolean
  disabled?: boolean
  icon?: ReactNode
}) {
  return (
    <StatefulButton
      type="submit"
      state={pending ? "loading" : "idle"}
      loadingText="Verificando…"
      icon={icon}
      disabled={disabled}
      size="lg"
      className="ites-cta-gradient w-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </StatefulButton>
  )
}
