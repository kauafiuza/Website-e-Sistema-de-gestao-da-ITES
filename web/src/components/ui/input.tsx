import { forwardRef, type ComponentProps } from "react"
import { Input as BeuiInput } from "@/components/motion/input"
import { cn } from "@/lib/utils"

type Props = ComponentProps<"input">

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, value, defaultValue, onChange, ...props },
  ref
) {
  return (
    <BeuiInput
      {...props}
      ref={ref}
      value={value == null ? undefined : String(value)}
      defaultValue={defaultValue == null ? undefined : String(defaultValue)}
      onNativeChange={onChange}
      className="w-full min-w-0"
      classNames={{
        field: cn(
          "h-8 w-full rounded-2xl border-input bg-input/50 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
          className
        ),
        input: cn("text-sm", className),
      }}
    />
  )
})

export { Input }
