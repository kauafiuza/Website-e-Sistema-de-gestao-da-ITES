import type { PageTemplate } from "./types"

export const BlogPage: PageTemplate = {
  order: 5,
  name: "Blog",
  navbar: "navbar-classic",
  blocks: [
    "blog-classic",
    "waitlist-classic",
    "footer-classic",
  ],
}
