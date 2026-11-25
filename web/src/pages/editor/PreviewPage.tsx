import { useEffect, useMemo, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { PageContent } from "./components/PageContent"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { defaultProjectTheme, themeVariables } from "./lib/project-theme"
import {
  builderDraftStorageKey,
  builderPreviewStorageKey,
  initialDocument,
  parseDocument,
} from "./lib/document"
import { useAuth } from "@/context/auth/auth.context"
import { useOrganization } from "@/context/organization/organization.context"
export default function PreviewPage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const { user } = useAuth()
  const { selectedOrganization } = useOrganization()
  const userId = user?.id
  const organizationId = selectedOrganization?.id
  const document = useMemo(() => {
    if (!userId || !organizationId) return initialDocument()
    const id = params.get("document")
    try {
      const snapshot = id && /^[\w-]+$/.test(id)
        ? parseDocument(localStorage.getItem(builderPreviewStorageKey(userId, organizationId, id)) ?? "")
        : null
      if (snapshot) return snapshot
      const draft = parseDocument(localStorage.getItem(builderDraftStorageKey(userId, organizationId)) ?? "")
      return draft ?? initialDocument()
    } catch {
      return initialDocument()
    }
  }, [params, userId, organizationId])
  const [previewModeState, setPreviewModeState] = useState(() => ({
    document,
    mode: document.theme?.mode ?? "light",
  }))
  const previewMode = previewModeState.document === document
    ? previewModeState.mode
    : document.theme?.mode ?? "light"
  useEffect(() => {
    const toggle = () => setPreviewModeState((current) => {
      const currentMode = current.document === document
        ? current.mode
        : document.theme?.mode ?? "light"
      return {
        document,
        mode: currentMode === "dark" ? "light" : "dark",
      }
    })
    window.addEventListener("builder:toggle-theme", toggle)
    return () => window.removeEventListener("builder:toggle-theme", toggle)
  }, [document])
  const previewTheme = useMemo(() => ({ ...(document.theme ?? defaultProjectTheme()), mode: previewMode }), [document.theme, previewMode])
  const requestedPath = decodeURIComponent(location.pathname)
    .replace(/^\/preview\/?/, "")
    .replace(/\/$/, "")
  const page = document.pages.find((candidate) => {
    const segments: string[] = []
    const visited = new Set<string>()
    let current: typeof candidate | undefined = candidate
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      segments.unshift(current.slug)
      const parentPageId: string | undefined = current.parentPageId
      current = parentPageId
        ? document.pages.find((item) => item.id === parentPageId)
        : undefined
    }
    return segments.join("/") === requestedPath
  }) ?? document.pages.find((candidate) => candidate.id === document.activePageId)!
  return (
    <div className="min-h-svh w-full bg-background">
      <SmoothScroll>
        <main
          data-testid="standalone-preview"
          className={`builder-authored-content min-h-svh w-full bg-background ${previewMode === "dark" ? "dark" : ""}`}
          style={themeVariables(previewTheme)}
        >
          <PageContent page={page} navbar={document.navbar} footer={document.footer} document={document} projectId="preview" routeSearch={location.search} />
        </main>
      </SmoothScroll>
    </div>
  )
}
