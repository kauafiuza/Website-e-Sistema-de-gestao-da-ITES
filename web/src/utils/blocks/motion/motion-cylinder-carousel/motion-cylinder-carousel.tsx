import { CylinderCarousel } from "@/components/motion/cylinder-carousel"
import type { BlockViewProps } from "@/utils/blocks/view-props"

export function MotionCylinderCarouselBlock({ props: p }: BlockViewProps) {
  const items = p.items?.length
    ? p.items
    : ["Design", "Motion", "React", "BeUI", "Builder"].map((title, index) => ({
        id: `carousel-${index}`,
        title,
        description: "",
        href: "",
        value: "",
        features: [],
      }))

  return (
    <section className="builder-block bg-background px-6 py-12 text-foreground">
      <CylinderCarousel itemSize={88} visibleItems={5} height={120} autoRotate>
        {items.map((item) => (
          <div key={item.id} className="grid size-20 place-items-center rounded-full border border-border bg-card px-2 text-center text-xs font-medium shadow-sm">
            {item.title}
          </div>
        ))}
      </CylinderCarousel>
    </section>
  )
}
