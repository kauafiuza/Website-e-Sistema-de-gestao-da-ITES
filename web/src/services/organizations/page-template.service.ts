import { apiPaths } from "@/services/helpers/api-paths"
import type { Block } from "@/pages/editor/lib/document"

export interface PageTemplateContent {
  blocks: PageTemplateBlockSnapshot[]
  composition?: {
    allowedDefinitionIds: string[]
    protectedRegions?: Array<"navbar" | "footer">
  }
  regions?: Partial<Record<"navbar" | "footer", PageTemplateBlockSnapshot>>
}

export interface PageTemplateBlockSnapshot {
  id?: string
  definitionId: string
  props: Block["props"]
  [key: string]: unknown
}

export interface OrganizationPageTemplate {
  id: string
  name: string
  versionId: string
  version: number
  content: PageTemplateContent
  createdBy: string | null
  versionCreatedBy: string | null
  createdAt: string
  versionCreatedAt: string
}

async function request<T>(
  token: string,
  organizationId: string,
  path: string,
  method = "GET",
  body?: object,
): Promise<T> {
  const response = await fetch(`${apiPaths.organizationTemplates(organizationId)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    throw new Error(response.status === 403
      ? "Sua conta não tem acesso aos modelos desta organização."
      : response.status === 409
        ? "O modelo mudou em outra sessão. Atualize a lista e tente novamente."
        : "Não foi possível acessar os modelos da organização.")
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const listOrganizationPageTemplates = (token: string, organizationId: string) =>
  request<OrganizationPageTemplate[]>(token, organizationId, "")

export const createOrganizationPageTemplate = (
  token: string,
  organizationId: string,
  name: string,
  content: PageTemplateContent,
) => request<OrganizationPageTemplate>(token, organizationId, "", "POST", { name, content })

export const listOrganizationPageTemplateVersions = (
  token: string,
  organizationId: string,
  templateId: string,
) => request<OrganizationPageTemplate[]>(token, organizationId, `/${encodeURIComponent(templateId)}/versions`)

export const createOrganizationPageTemplateVersion = (
  token: string,
  organizationId: string,
  template: OrganizationPageTemplate,
  content: PageTemplateContent,
) => request<OrganizationPageTemplate>(
  token,
  organizationId,
  `/${encodeURIComponent(template.id)}/versions`,
  "POST",
  { expectedVersion: template.version, content },
)

export const archiveOrganizationPageTemplate = (
  token: string,
  organizationId: string,
  templateId: string,
) => request<void>(token, organizationId, `/${encodeURIComponent(templateId)}`, "DELETE")
