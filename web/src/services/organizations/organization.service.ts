import { apiPaths } from "@/services/helpers/api-paths"

export interface OrganizationMembership {
  id: string
  name: string
  role: "OWNER" | "MEMBER"
  isDefault: boolean
}

export type OrganizationFeatureKey = "PROJECTS" | "THEMES" | "PUBLICATIONS" | "FORM_RESPONSES"

export interface OrganizationFeatureAvailability {
  featureKey: OrganizationFeatureKey
  version: number
  name: string
  description: string
  enabled: boolean
}

export type PermissionAction =
  | "PROJECT_READ" | "PROJECT_CREATE" | "PROJECT_UPDATE" | "PROJECT_DELETE"
  | "THEME_READ" | "THEME_CREATE" | "THEME_UPDATE" | "THEME_DELETE"
  | "PUBLICATION_READ" | "PUBLICATION_MANAGE" | "PUBLICATION_APPROVE" | "PUBLICATION_ANALYTICS_READ"
  | "PUBLICATION_SUBMISSIONS_READ" | "PUBLICATION_SUBMISSIONS_EXPORT" | "PUBLICATION_ACTIVITY_READ"
  | "ORGANIZATION_GRANTS_READ" | "ORGANIZATION_GRANTS_MANAGE" | "ORGANIZATION_AUDIT_READ"

export interface OrganizationAuditEvent {
  id: string
  organizationId: string
  actorUserId: string
  action: string
  targetType: string
  targetId: string
  occurredAt: string
}

export interface OrganizationAuditEventPage {
  items: OrganizationAuditEvent[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export type GrantScopeType = "ORGANIZATION" | "PROJECT" | "THEME"

export interface OrganizationMember {
  userId: string
  firstName: string
  lastName: string
  email: string
  role: OrganizationMembership["role"]
  state: "ACTIVE" | "REVOKED"
  createdAt: string
}

export interface OrganizationInvitation {
  id: string
  organizationId: string
  email: string
  role: "MEMBER"
  state: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  invitedByUserId: string
  acceptedUserId: string | null
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
}

export interface OrganizationInvitationLookup {
  organizationId: string
  organizationName: string
  email: string
  state: OrganizationInvitation["state"]
  expiresAt: string
}

export interface PermissionGrant {
  id: string
  beneficiaryUserId: string
  organizationId: string
  action: PermissionAction
  scopeType: GrantScopeType
  scopeId: string
  issuerUserId: string
  validUntil: string | null
  state: "ACTIVE" | "REVOKED"
  canDelegate: boolean
  parentGrantId: string | null
  authorityGrantId: string | null
  createdAt: string
  revokedAt: string | null
}

export interface CreatePermissionGrant {
  beneficiaryUserId: string
  action: PermissionAction
  scopeType: GrantScopeType
  scopeId: string
  validUntil?: string | null
  canDelegate: boolean
  parentGrantId?: string | null
  authorityGrantId?: string | null
}

export class OrganizationRequestError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = "OrganizationRequestError"
    this.status = status
    this.code = code
  }
}

export const ORGANIZATION_PREFERENCE_KEY = "builder-active-organization-v1"

export async function listOrganizations(token: string): Promise<OrganizationMembership[]> {
  const response = await fetch(apiPaths.organizations, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Não foi possível carregar suas organizações.")
  return response.json() as Promise<OrganizationMembership[]>
}

export async function listOrganizationFeatures(token: string, organizationId: string): Promise<OrganizationFeatureAvailability[]> {
  const response = await fetch(apiPaths.organizationFeatures(organizationId), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Não foi possível consultar os recursos desta organização.")
  return response.json() as Promise<OrganizationFeatureAvailability[]>
}

async function requestOrganization<T>(token: string | null, path: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...organizationRequestHeaders(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string; code?: string } | null
    const message = response.status === 401
      ? "Sua sessão expirou. Entre novamente para continuar."
      : response.status === 403
        ? "Sua conta não tem autoridade para esta ação."
        : response.status === 400 || response.status === 422
          ? problem?.detail ?? problem?.message ?? "Revise os dados informados."
          : problem?.detail ?? problem?.message ?? "Não foi possível concluir a operação."
    throw new OrganizationRequestError(response.status, message, problem?.code)
  }
  if (response.status === 204) return undefined as T
  const content = await response.text()
  return content ? JSON.parse(content) as T : undefined as T
}

export const listOrganizationMembers = (token: string, organizationId: string) =>
  requestOrganization<OrganizationMember[]>(token, apiPaths.organizationMembers(organizationId))

export const listOrganizationInvitations = (token: string, organizationId: string) =>
  requestOrganization<OrganizationInvitation[]>(token, apiPaths.organizationInvitations(organizationId))

export const inviteOrganizationMember = (token: string, organizationId: string, email: string) =>
  requestOrganization<OrganizationInvitation>(token, apiPaths.organizationInvitations(organizationId), "POST", { email })

export const revokeOrganizationInvitation = (token: string, organizationId: string, invitationId: string) =>
  requestOrganization<void>(token, `${apiPaths.organizationInvitations(organizationId)}/${encodeURIComponent(invitationId)}`, "DELETE")

export const revokeOrganizationMember = (token: string, organizationId: string, userId: string) =>
  requestOrganization<void>(token, `${apiPaths.organizationMembers(organizationId)}/${encodeURIComponent(userId)}`, "DELETE")

export const listOrganizationGrants = (token: string, organizationId: string) =>
  requestOrganization<{ items: PermissionGrant[]; totalElements: number }>(token, apiPaths.organizationGrants(organizationId))

export const createOrganizationGrant = (token: string, organizationId: string, grant: CreatePermissionGrant) =>
  requestOrganization<PermissionGrant>(token, apiPaths.organizationGrants(organizationId), "POST", grant)

export const revokeOrganizationGrant = (token: string, organizationId: string, grantId: string) =>
  requestOrganization<void>(token, `${apiPaths.organizationGrants(organizationId)}/${encodeURIComponent(grantId)}`, "DELETE")

export const listOrganizationAuditEvents = (token: string, organizationId: string, page = 0, size = 50) =>
  requestOrganization<OrganizationAuditEventPage>(token,
    `${apiPaths.organizationAuditEvents(organizationId)}?page=${page}&size=${size}`)

export const lookupOrganizationInvitation = (token: string) => {
  const params = new URLSearchParams({ token })
  return requestOrganization<OrganizationInvitationLookup>(null, `${apiPaths.organizationInvitationLookup}?${params}`)
}

export const acceptOrganizationInvitation = (token: string, invitationToken: string) =>
  requestOrganization<OrganizationInvitation>(token, apiPaths.organizationInvitationAccept, "POST", { token: invitationToken })

/** A preferência local escolhe o contexto enviado; o servidor valida vínculo e permissões. */
export function organizationRequestHeaders(): Record<string, string> {
  try {
    const organizationId = localStorage.getItem(ORGANIZATION_PREFERENCE_KEY)
    return organizationId ? { "X-Organization-Id": organizationId } : {}
  } catch {
    return {}
  }
}
