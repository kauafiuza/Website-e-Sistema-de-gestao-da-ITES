import { AnimatedBadge } from "@/components/motion/animated-badge"
import type { BlockViewProps } from "@/utils/blocks/view-props"

export function MotionAnimatedBadgeBlock({ props: p }: BlockViewProps) {
  return (
    <section className="builder-block flex min-h-32 items-center justify-center bg-background px-6 py-10">
      <AnimatedBadge status="success" size="md" pulse>
        {p.title || "All systems operational"}
      </AnimatedBadge>
    </section>
  )
}
