import type { PageTemplate } from "./types"

export const ProductLaunchPage: PageTemplate = {
  order: 11,
  name: "Product Launch",
  navbar: "navbar-actions",
  blocks: [
    "hero-product",
    "product-overview",
    "features-tabs",
    "faq-support",
    "footer-directory",
  ],
}
