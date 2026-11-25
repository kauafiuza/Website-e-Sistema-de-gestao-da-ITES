import type { PageTemplate } from "./types"

export const ProductPage: PageTemplate = {
  order: 20,
  name: "Product",
  navbar: "navbar-actions",
  blocks: [
    "hero-basic-product",
    "product-overview",
    "trust-strip",
    "reviews-list",
    "faq-support",
    "footer-classic",
  ],
}
