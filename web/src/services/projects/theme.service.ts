import { apiPaths } from "@/services/helpers/api-paths"
import type { ProjectTheme } from "@/pages/editor/lib/project-theme"
import type { PageResponse } from "@/types/api/pagination"
import { organizationRequestHeaders } from "@/services/organizations/organization.service"

export interface SavedTheme {
  id: string
  name: string
  configuration: ProjectTheme
}

async function request<T>(token: string, method: string, body?: object, query?: string): Promise<T> {
  const response = await fetch(`${apiPaths.themes}${query ? `?${query}` : ""}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...organizationRequestHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(response.status === 409 ? "Já existe um tema com esse nome." : "Não foi possível acessar seus temas.")
  return response.json() as Promise<T>
}
export const listThemes = (token: string, page = 0, size = 20) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  return request<PageResponse<SavedTheme>>(token, "GET", undefined, params.toString())
}
export const createTheme = (token: string, name: string, configuration: ProjectTheme) =>
  request<SavedTheme>(token, "POST", { name, configuration: { ...configuration, presetId: undefined } })

export const updateTheme = (token: string, theme: SavedTheme) =>
  fetch(`${apiPaths.themes}/${encodeURIComponent(theme.id)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      ...organizationRequestHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: theme.name,
      configuration: { ...theme.configuration, presetId: undefined },
    }),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(response.status === 409
        ? "Já existe um tema com esse nome."
        : "Não foi possível atualizar o tema.")
    }
    return response.json() as Promise<SavedTheme>
  })

export async function deleteTheme(token: string, id: string): Promise<void> {
  const response = await fetch(`${apiPaths.themes}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, ...organizationRequestHeaders() },
  })
  if (!response.ok) {
    throw new Error(response.status === 409
      ? "Este tema está vinculado a um projeto e não pode ser excluído."
      : "Não foi possível excluir o tema.")
  }
}
