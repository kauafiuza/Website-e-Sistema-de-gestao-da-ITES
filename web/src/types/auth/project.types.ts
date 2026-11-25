import type { BuilderDocument } from "@/pages/editor/lib/document";
import type { ProjectTheme } from "@/pages/editor/lib/project-theme";

export type ProjectPreview = {
  pageName: string
  blocks: BuilderDocument["pages"][number]["blocks"]
  theme: ProjectTheme | null
}

export type ProjectSummary = { 
    id: string; 
    name: string; 
    revision: number; 
    createdAt: string; 
    updatedAt: string
    preview: ProjectPreview
    publicationActive?: boolean | null
}

export type ProjectRoute = { pageId: string; slug: string; path: string; parentPageId?: string }
export type Project = ProjectSummary & { document: BuilderDocument; routeBlueprint: ProjectRoute[] }

/**
 * Métodos HTTP utilizados nas operações de projetos.
 */
export type ProjectHttpMethod = "GET" | "POST" | "PATCH" | "DELETE"
