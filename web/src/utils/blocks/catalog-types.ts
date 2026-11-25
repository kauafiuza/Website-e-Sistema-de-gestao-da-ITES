import type { ComponentType } from "react"
import type { BlockProps } from "./types"
import type { BlockViewProps } from "./view-props"

export interface Definition {
  id: string
  name: string
  category: string
  group?: string
  variant: string
  description: string
  defaults: BlockProps
  component: ComponentType<BlockViewProps>
  editableProperties: (keyof BlockProps)[]
  export: {
    componentName: string
    sourceFile: string
    dependencies: string[]
    tailwindVersion: number
  }
}
