import { forwardRef, useState } from "react"
import { Eye, EyeOff, LockKeyhole } from "lucide-react"
import { Input, type InputProps } from "@/components/motion/input"
import { Button } from "@/components/motion/button/base"

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type" | "rightIcon" | "leftIcon">>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      ref={ref}
      {...props}
      type={visible ? "text" : "password"}
      spellCheck={false}
      leftIcon={<LockKeyhole aria-hidden="true" />}
      rightIcon={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="rounded-full hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      }
    />
  )
})
