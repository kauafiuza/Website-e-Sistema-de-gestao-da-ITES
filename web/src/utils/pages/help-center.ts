import type { PageTemplate } from "./types"

export const HelpCenterPage: PageTemplate = {
  order: 17,
  name: "Help Center",
  navbar: "navbar-classic",
  blocks: [
    "help-center",
    "faq-support",
    "contact-channels",
    "footer-directory",
  ],
}
