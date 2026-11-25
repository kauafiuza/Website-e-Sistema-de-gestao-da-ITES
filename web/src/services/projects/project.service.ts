import { apiPaths } from "@/services/helpers/api-paths"
import type { BuilderDocument } from "@/pages/editor/lib/document"
import type { Project, ProjectHttpMethod, ProjectSummary } from "@/types/auth/project.types"
import { PROJECT_ERROR_MESSAGES } from "./utils/project-messages"
import type { PageResponse } from "@/types/api/pagination"
import { organizationRequestHeaders } from "@/services/organizations/organization.service"

/**
 * Representa um erro HTTP ocorrido durante uma operação de projeto.
 *
 * O status 409 indica um conflito de versão, geralmente causado por
 * alterações realizadas em outra sessão.
 */
export class ProjectError extends Error {
  readonly status: number

  constructor(status: number) {
    const message =
      status === 409
        ? PROJECT_ERROR_MESSAGES.CONFLICT
        : PROJECT_ERROR_MESSAGES.DEFAULT

    super(message)

    this.name = "ProjectError"
    this.status = status
  }
}

export interface DraftRevision {
  id: string
  revision: number
  createdAt: string
}

/**
 * Executa uma requisição autenticada à API de projetos.
 *
 * Centraliza a autenticação, a serialização do corpo e o
 * tratamento de erros HTTP.
 *
 * @template T Tipo esperado para os dados retornados.
 * @param token Token de autenticação do usuário.
 * @param url Endpoint da operação.
 * @param method Método HTTP utilizado.
 * @param body Dados opcionais enviados como JSON.
 * @returns Dados retornados pela API ou undefined para HTTP 204.
 * @throws {ProjectError} Quando a resposta HTTP não é bem-sucedida.
 */
async function request<T>(
  token: string,
  url: string,
  method: ProjectHttpMethod = "GET",
  body?: object,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...organizationRequestHeaders(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new ProjectError(response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

/**
 * Lista os projetos disponíveis para o usuário autenticado.
 */
export const listProjects = (
  token: string,
  options: { page?: number; size?: number; q?: string; sort?: "recent" | "old" | "name" } = {},
): Promise<PageResponse<ProjectSummary>> => {
  const params = new URLSearchParams({
    page: String(options.page ?? 0),
    size: String(options.size ?? 10),
    q: options.q ?? "",
    sort: options.sort ?? "recent",
  })
  return request<PageResponse<ProjectSummary>>(token, `${apiPaths.projects}?${params}`)
}

/**
 * Busca os dados completos de um projeto pelo identificador.
 */
export const getProject = (
  token: string,
  id: string,
): Promise<Project> =>
  request<Project>(token, apiPaths.project(id))

export const listProjectRevisions = (
  token: string,
  id: string,
  page = 0,
  size = 10,
): Promise<PageResponse<DraftRevision>> => {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  return request<PageResponse<DraftRevision>>(
    token,
    `${apiPaths.projectRevisions(id)}?${params}`,
  )
}

export const restoreProjectRevision = (
  token: string,
  id: string,
  revisionId: string,
): Promise<Project> =>
  request<Project>(token, apiPaths.projectRevisionRestore(id, revisionId), "POST")

/**
 * Cria um projeto a partir de um documento do editor.
 *
 * O nome inicial do projeto é obtido do próprio documento.
 */
export const createProject = (
  token: string,
  document: BuilderDocument,
): Promise<Project> =>
  request<Project>(token, apiPaths.projects, "POST", {
    name: document.name,
    document,
  })

/**
 * Atualiza o documento de um projeto existente.
 *
 * A revisão atual é enviada para permitir que o backend
 * identifique possíveis conflitos de edição.
 */
export const updateProject = (
  token: string,
  id: string,
  revision: number,
  document: BuilderDocument,
): Promise<Project> =>
  request<Project>(token, apiPaths.project(id), "PATCH", {
    revision,
    document,
  })

/** Adota áreas compartilhadas de um snapshot ativo resolvido pelo servidor. */
export const adoptProjectTemplateRegions = (
  token: string,
  id: string,
  revision: number,
  templateId: string,
  versionId: string,
  regions: Array<"navbar" | "footer">,
): Promise<Project> =>
  request<Project>(token, `${apiPaths.project(id)}/regions/adoption`, "PATCH", {
    revision,
    templateId,
    versionId,
    regions,
  })

/**
 * Altera o nome de um projeto existente.
 *
 * A revisão é enviada para preservar o controle de concorrência.
 */
export const renameProject = (
  token: string,
  id: string,
  revision: number,
  name: string,
): Promise<Project> =>
  request<Project>(token, apiPaths.projectName(id), "PATCH", {
    revision,
    name,
  })

/**
 * Exclui um projeto pelo identificador.
 */
export const deleteProject = (
  token: string,
  id: string,
): Promise<void> =>
  request<void>(token, apiPaths.project(id), "DELETE")
