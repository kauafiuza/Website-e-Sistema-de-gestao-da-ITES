import type { PageTemplate } from "./types"

export const FaqPage: PageTemplate = {
  order: 7,
  name: "FAQ",
  navbar: "navbar-classic",
  blocks: [
    "faq-classic",
    "cta-split",
    "footer-classic",
  ],
}
