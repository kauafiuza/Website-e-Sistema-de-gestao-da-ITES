import type { PageTemplate } from "./types"

export const FeaturePage: PageTemplate = {
  order: 2,
  name: "Feature",
  navbar: "navbar-classic",
  blocks: [
    "hero-classic",
    "features-split",
    "faq-classic",
    "footer-classic",
  ],
}
