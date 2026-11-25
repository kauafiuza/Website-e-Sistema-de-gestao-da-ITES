import { Loader } from "@/components/motion/loader"
import type { BlockViewProps } from "@/utils/blocks/view-props"

export function MotionLoaderBlock({ props: p }: BlockViewProps) {
  return (
    <section className="builder-block flex min-h-32 items-center justify-center gap-4 bg-background px-6 py-10 text-foreground">
      <Loader variant="morph" size={40} label={p.title || "Loading"} />
      <span className="text-sm text-muted-foreground">{p.title || "Loading"}</span>
    </section>
  )
}
