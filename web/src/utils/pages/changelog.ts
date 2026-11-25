import type { PageTemplate } from "./types"

export const ChangelogPage: PageTemplate = {
  order: 10,
  name: "Changelog",
  navbar: "navbar-classic",
  blocks: [
    "changelog-classic",
    "footer-classic",
  ],
}
