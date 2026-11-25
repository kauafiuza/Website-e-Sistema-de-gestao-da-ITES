import type { blockComponents } from "@/utils/blocks"
import type { ProjectTheme } from "@/pages/editor/lib/project-theme"
import type { ContentItem } from "@/utils/blocks/types"

export type NavbarDefinitionId = Extract<
  keyof typeof blockComponents,
  `navbar-${string}`
>

export type PageBlockDefinitionId = Exclude<
  keyof typeof blockComponents,
  `navbar-${string}`
>

export interface PageTemplate {
  order: number
  name: string
  navbar?: NavbarDefinitionId
  navbarItems?: ContentItem[]
  blocks: PageBlockDefinitionId[]
  theme?: ProjectTheme
}
