import type { PageTemplate } from "./types"

export const LandingPage: PageTemplate = {
  order: 1,
  name: "Landing",
  navbar: "navbar-split",
  blocks: [
    "hero-split",
    "features-classic",
    "social-classic",
    "pricing-classic",
    "cta-classic",
    "footer-split",
  ],
}
