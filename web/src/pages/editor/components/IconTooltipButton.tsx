import type { ComponentProps, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/motion/tooltip"

type Props = Omit<ComponentProps<typeof Button>, "aria-label"> & {
  label: string
  children: ReactNode
}

/** Adds a visual hint while keeping the button's explicit accessible name. */
export function IconTooltipButton({ label, children, ...buttonProps }: Props) {
  return (
    <Tooltip content={label}>
      <Button {...buttonProps} aria-label={label}>
        {children}
      </Button>
    </Tooltip>
  )
}
