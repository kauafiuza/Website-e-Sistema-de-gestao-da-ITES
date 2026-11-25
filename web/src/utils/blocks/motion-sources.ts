import bouncyAccordion from "@/components/motion/bouncy-accordion.tsx?raw"
import centerMorphModal from "@/components/motion/center-morph-modal.tsx?raw"
import cylinderCarousel from "@/components/motion/cylinder-carousel.tsx?raw"
import expandableTabs from "@/components/motion/expandable-tabs.tsx?raw"
import magnetic from "@/components/motion/magnetic.tsx?raw"
import magneticButton from "@/components/motion/button/magnetic.tsx?raw"
import buttonBase from "@/components/motion/button/base.tsx?raw"
import shaderBackground from "@/components/motion/shader-background.tsx?raw"
import smoothScroll from "@/components/motion/smooth-scroll.tsx?raw"
import textReveal from "@/components/motion/text-reveal.tsx?raw"
import floatingDock from "@/components/motion/floating-dock.tsx?raw"
import ease from "@/lib/ease.ts?raw"
import touch from "@/lib/touch.ts?raw"
import utils from "@/lib/utils.ts?raw"
import hoverCapable from "@/lib/hooks/use-hover-capable.ts?raw"
import presenceGate from "@/lib/presence-gate.tsx?raw"
import animatedBadge from "@/components/motion/animated-badge.tsx?raw"
import loader from "@/components/motion/loader.tsx?raw"

export const portableMotionSources: Record<string, string> = {
  "@/components/motion/bouncy-accordion": bouncyAccordion,
  "@/components/motion/center-morph-modal": centerMorphModal,
  "@/components/motion/cylinder-carousel": cylinderCarousel,
  "@/components/motion/expandable-tabs": expandableTabs,
  "@/components/motion/magnetic": magnetic,
  "@/components/motion/button/magnetic": magneticButton,
  "@/components/motion/button/base": buttonBase,
  "@/components/motion/shader-background": shaderBackground,
  "@/components/motion/smooth-scroll": smoothScroll,
  "@/components/motion/text-reveal": textReveal,
  "@/components/motion/floating-dock": floatingDock,
  "@/lib/ease": ease,
  "@/lib/touch": touch,
  "@/lib/utils": utils,
  "@/lib/hooks/use-hover-capable": hoverCapable,
  "@/lib/presence-gate": presenceGate,
  "@/components/motion/animated-badge": animatedBadge,
  "@/components/motion/loader": loader,
}
