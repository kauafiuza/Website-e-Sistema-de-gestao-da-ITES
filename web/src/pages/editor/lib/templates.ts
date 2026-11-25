import { definitions } from "@/utils/blocks"
import { uid, type Block, type PageTemplateOrigin } from "./document"
import type { PageBlockDefinitionId, PageTemplate } from "@/utils/pages/types"
import type {
  OrganizationPageTemplate,
  PageTemplateBlockSnapshot,
} from "@/services/organizations/page-template.service"
export { templates } from "@/utils/pages"

const BUNDLED_TEMPLATE_VERSION = 1

export function bundledTemplateOrigin(template: PageTemplate): PageTemplateOrigin {
  const templateId = `bundled:${template.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  return {
    source: "BUNDLED",
    templateId,
    versionId: `${templateId}:v${BUNDLED_TEMPLATE_VERSION}`,
    version: BUNDLED_TEMPLATE_VERSION,
  }
}

export function organizationTemplateOrigin(
  template: OrganizationPageTemplate,
): PageTemplateOrigin {
  return {
    source: "ORGANIZATION",
    templateId: template.id,
    versionId: template.versionId,
    version: template.version,
  }
}

export function copyTemplateBlocks(
  blocks: readonly PageTemplateBlockSnapshot[],
): Block[] {
  return blocks.map((block): Block => ({ ...structuredClone(block), id: uid() }))
}

export function templateBlocks(ids: PageBlockDefinitionId[]): Block[] {
  return ids.flatMap((id) => {
    const definition = definitions.get(id)
    return definition
      ? [
          {
            id: uid(),
            definitionId: id,
            props: structuredClone(definition.defaults),
          },
        ]
      : []
  })
}

export function templateNavbar(
  definitionId?: PageTemplate["navbar"],
  items?: PageTemplate["navbarItems"]
): Block | undefined {
  if (!definitionId) return undefined
  const definition = definitions.get(definitionId)
  if (!definition || definition.category !== "navbar") return undefined
  return {
    id: uid(),
    definitionId,
    props: {
      ...structuredClone(definition.defaults),
      ...(items ? { items: structuredClone(items) } : {}),
    },
  }
}
