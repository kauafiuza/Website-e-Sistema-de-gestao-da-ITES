import type { PageResponse } from "@/types/api/pagination"
import { organizationRequestHeaders } from "@/services/organizations/organization.service"

export interface Publication {
  projectId: string
  projectName: string
  publicKey: string
  active: boolean
  currentVersion: number
  views: number
  clicks: number
  interactions: number
  preview: import("@/types/auth/project.types").ProjectPreview
  versions: { number: number; projectRevision: number; projectRevisionId: string; publishedAt: string; expiresAt: string | null }[]
}

export interface PublicationReviewRequest {
  id: string
  projectId: string
  projectRevisionId: string
  projectRevision: number
  operation: "PUBLISH" | "RESTORE"
  targetVersion: number | null
  requesterUserId: string
  approverUserId: string | null
  state: "PENDING" | "APPROVED" | "REJECTED"
  canDecide: boolean
  createdAt: string
  decidedAt: string | null
  consumedAt: string | null
}

export interface PublicationReviewInboxItem {
  id: string
  projectId: string
  projectName: string
  projectRevisionId: string
  projectRevision: number
  operation: "PUBLISH" | "RESTORE"
  targetVersion: number | null
  state: "PENDING"
  canDecide: true
  createdAt: string
}

export interface PublicationReviewPreview {
  projectRevision: number
  document: import("@/pages/editor/lib/document").BuilderDocument
}

export interface PublicPage {
  publicKey: string
  version: number
  projectRevision: number
  document: import("@/pages/editor/lib/document").BuilderDocument
  pageId: string
  formReferences: { pageId: string; blockId: string; formId: string; formVersionId: string; formVersion: number }[]
}

export interface PublicationAnalytics {
  daily: { day: string; views: number; clicks: number; interactions: number }[]
  recent: PageResponse<{ id: number; type: "view" | "click" | "interaction"; version: number; path: string | null; target: string | null; occurredAt: string }>
}
export interface FormSubmission {
  id: string
  version: number
  pageId: string
  blockId: string
  formName: string
  fields: Record<string, string>
  fieldSchema: import("@/utils/blocks/types").FormField[] | null
  occurredAt: string
}
export type DailyActivity = PublicationAnalytics["daily"][number]

async function authenticated<T>(token: string, path: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...organizationRequestHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(response.status === 401
    ? "Sua sessão expirou. Entre novamente para continuar."
    : response.status === 403 ? "Sua conta não tem autoridade para esta ação."
      : response.status === 400 || response.status === 422 ? "Revise os dados informados."
        : response.status === 404 ? "Publicação não encontrada." : "Não foi possível concluir a operação.")
  return response.json() as Promise<T>
}

export async function exportFormSubmissions(token: string, id: string, search = ""): Promise<Blob> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}/publication/submissions/export${query}`, {
    headers: { Authorization: `Bearer ${token}`, ...organizationRequestHeaders() },
  })
  if (!response.ok) throw new Error(response.status === 401
    ? "Sua sessão expirou. Entre novamente para continuar."
    : response.status === 403 ? "Sua conta não tem permissão para exportar respostas."
      : response.status === 400 || response.status === 422 ? "Revise os dados da solicitação de exportação."
        : "Não foi possível exportar as respostas.")
  return response.blob()
}

export const listPublications = (
  token: string,
  options: { page?: number; size?: number; q?: string; sort?: "recent" | "old" | "name" } = {},
) => {
  const params = new URLSearchParams({
    page: String(options.page ?? 0),
    size: String(options.size ?? 10),
    q: options.q ?? "",
    sort: options.sort ?? "recent",
  })
  return authenticated<PageResponse<Publication>>(token, `/publications?${params}`)
}
export const getPublicationsOverview = (token: string) => authenticated<DailyActivity[]>(token, "/publications/analytics")
export const getPublication = (token: string, id: string) => authenticated<Publication>(token, `/projects/${encodeURIComponent(id)}/publication`)
export const getPublicationAnalytics = (token: string, id: string) => authenticated<PublicationAnalytics>(token, `/projects/${encodeURIComponent(id)}/publication/analytics`)
export const getFormSubmissions = (token: string, id: string, page = 0, size = 10, search = "") => {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (search.trim()) params.set("search", search.trim())
  return authenticated<PageResponse<FormSubmission>>(token, `/projects/${encodeURIComponent(id)}/publication/submissions?${params}`)
}
export const getPublicationActivity = (token: string, id: string, page = 0, size = 10) => authenticated<PageResponse<PublicationAnalytics["recent"]["items"][number]>>(token, `/projects/${encodeURIComponent(id)}/publication/activity?page=${page}&size=${size}`)
export const listPublicationReviewRequests = (token: string, id: string) => authenticated<PublicationReviewRequest[]>(token, `/projects/${encodeURIComponent(id)}/publication/review-requests`)
export const listPublicationReviewInbox = (token: string) => authenticated<PublicationReviewInboxItem[]>(token, "/publication/review-requests")
export const getPublicationReviewPreview = (token: string, request: Pick<PublicationReviewInboxItem, "projectId" | "id">) => authenticated<PublicationReviewPreview>(token, `/projects/${encodeURIComponent(request.projectId)}/publication/review-requests/${encodeURIComponent(request.id)}/preview`)
export const requestPublicationReview = (token: string, id: string, projectRevisionId: string, operation: PublicationReviewRequest["operation"], targetVersion?: number) => authenticated<PublicationReviewRequest>(token, `/projects/${encodeURIComponent(id)}/publication/review-requests`, "POST", { projectRevisionId, operation, ...(targetVersion === undefined ? {} : { targetVersion }) })
export const decidePublicationReview = (token: string, id: string, requestId: string, approved: boolean) => authenticated<PublicationReviewRequest>(token, `/projects/${encodeURIComponent(id)}/publication/review-requests/${encodeURIComponent(requestId)}/decision`, "POST", { approved })
export const publishProject = (token: string, id: string, reviewRequestId: string | null) => authenticated<Publication>(token, `/projects/${encodeURIComponent(id)}/publication`, "POST", { reviewRequestId })
export const setPublicationActive = (token: string, id: string, active: boolean) => authenticated<Publication>(token, `/projects/${encodeURIComponent(id)}/publication`, "PATCH", { active })
export const restorePublication = (token: string, id: string, version: number, reviewRequestId: string) => authenticated<Publication>(token, `/projects/${encodeURIComponent(id)}/publication/versions/${version}/restore`, "POST", { reviewRequestId })
export const publicUrl = (key: string) => `/p/${key}/`

