import { useEffect, useRef, useState } from "react"
import { ArrowDown } from "lucide-react"
import { ShaderBackground } from "@/components/motion/shader-background"
import { useSmoothScroll } from "@/components/motion/smooth-scroll"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps } from "@/utils/blocks/types"

export function ProfileHeroBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [heroInView, setHeroInView] = useState(true)
  const { scrollTo } = useSmoothScroll()
  const image = p.imageUrl?.trim() ? safeImageUrl(p.imageUrl) : ""
  const backgroundLogo = p.backgroundLogoUrl?.trim() ? safeImageUrl(p.backgroundLogoUrl) : ""
  const customBackground = p.backgroundMode === "solid" || p.backgroundMode === "gradient"
  const showShader = p.backgroundMode !== "solid" && Boolean(p.animateBackground)

  useEffect(() => {
    const node = sectionRef.current
    if (!node || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting), { threshold: 0 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [showShader])

  return (
    <section ref={sectionRef} id="hero" aria-label="Abertura do portfólio" className="relative flex min-h-svh w-full min-w-0 max-w-full flex-col items-center justify-center overflow-hidden border-b border-border/30 bg-background text-foreground">
      {!customBackground ? <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#bbfbff] via-[#8dd8ff] via-55% to-[#5409da]" /> : null}
      {showShader && heroInView ? <ShaderBackground variant="mesh-gradient" colors={[p.backgroundGradientFrom ?? "#bbfbff", p.backgroundGradientVia ?? "#8dd8ff", p.backgroundGradientTo ?? "#5409da"]} distortion={0.45} swirl={0.35} speed={0.25} minPixelRatio={1} maxPixelCount={1920 * 1080} className="pointer-events-none absolute inset-0" /> : null}
      {!customBackground ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#06142a]/70 via-[#06142a]/20 to-transparent" /> : null}
      {!customBackground ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#5409da]/25 via-[#4e71ff]/10 to-[#0b2447]/70" /> : null}
      {customBackground ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/45 via-transparent to-background/65" /> : null}
      <div className="relative z-10 flex min-h-svh w-full min-w-0 max-w-full flex-col justify-center overflow-hidden">
        <div className="relative flex flex-1 items-end justify-center">
          <h1 className="sr-only"><InlineText editor={editor} focusable={false} target={{ kind: "property", key: "title" }} value={p.title} label="nome do portfólio" /></h1>
          {backgroundLogo ? <img src={backgroundLogo} alt={p.backgroundLogoAlt ?? ""} draggable="false" className="profile-media-reveal pointer-events-none absolute bottom-24 left-1/2 z-20 w-[min(88vw,22rem)] -translate-x-1/2 select-none object-contain opacity-95 mix-blend-screen brightness-125 drop-shadow-[0_0_2.5rem_rgba(165,215,232,0.34)] sm:bottom-auto sm:top-[42%] sm:z-0 sm:w-[min(100vw,78rem)] sm:-translate-y-1/2 lg:top-[45%] lg:w-[min(86vw,88rem)]" /> : null}
          {image ? <InlineImage editor={editor} url={p.imageUrl || image} alt={p.imageAlt ?? ""} className="relative z-10 flex h-[88svh] w-full min-w-0 max-w-full items-end justify-center sm:h-auto sm:max-h-[78svh] lg:max-h-[86svh]"><img src={image} alt={p.imageAlt ?? ""} draggable="false" fetchPriority="high" className="profile-media-reveal h-[88svh] w-full max-w-full translate-x-0 object-contain object-bottom drop-shadow-2xl sm:h-auto sm:max-h-[78svh] sm:max-w-[112vw] lg:max-h-[86svh]" /></InlineImage> : null}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[34svh] bg-gradient-to-t from-background/75 via-background/25 to-transparent sm:hidden" />
        </div>
      </div>
      {!customBackground ? <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 bg-gradient-to-b from-transparent via-background/60 to-background sm:hidden" /> : null}
      <button type="button" data-editor-action="scroll" aria-label="Rolar para a próxima seção" onClick={() => scrollTo("#sobre", { duration: 1.1 })} className="absolute bottom-6 left-1/2 z-30 flex size-11 -translate-x-1/2 items-center justify-center rounded-full border border-border/40 bg-background/35 text-foreground/80 backdrop-blur-md transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"><ArrowDown className="size-5 animate-bounce" aria-hidden="true" /></button>
    </section>
  )
}
