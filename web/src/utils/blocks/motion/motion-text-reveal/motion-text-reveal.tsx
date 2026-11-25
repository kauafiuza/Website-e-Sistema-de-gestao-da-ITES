import { TextReveal } from "@/components/motion/text-reveal"
import type { BlockViewProps } from "@/utils/blocks/view-props"

export function MotionTextRevealBlock({ props: p }: BlockViewProps) {
  return (
    <section className="builder-block flex min-h-40 items-center justify-center bg-background px-6 py-12 text-center text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
      <TextReveal text={p.title || "Motion, made tangible."} split="word" />
    </section>
  )
}
