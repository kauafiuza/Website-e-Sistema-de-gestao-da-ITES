import type { InlineEditor } from "./shared/inline-editing"
import type { BlockProps } from "./types"

export interface BlockViewProps {
  props: BlockProps
  editor?: InlineEditor
  preview?: boolean
}
