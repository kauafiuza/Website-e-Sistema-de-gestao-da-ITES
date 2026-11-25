import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { useAuth } from "@/context/auth/auth.context"
import { adoptProjectTemplateRegions, getProject, updateProject, ProjectError } from "@/services/projects/project.service"
import {
  initialDocument,
  parseDocument,
  reduceDocument,
  builderDraftStorageKey,
  projectDraftStorageKey,
  type Action,
  type BuilderDocument,
} from "./document"
import { useOrganization } from "@/context/organization/organization.context"
interface History {
  document: BuilderDocument
  past: BuilderDocument[]
  future: BuilderDocument[]
  editedBlock: string | null
}
type HistoryAction =
  | { type: "apply"; action: Action }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "external"; document: BuilderDocument }
function restore(storageKey: string | null): History {
  let document = initialDocument()
  try {
    const saved = storageKey ? localStorage.getItem(storageKey) : null
    if (saved) {
      const restored = parseDocument(saved)
      if (restored) document = restored
      else if (storageKey) localStorage.setItem(`${storageKey}-recovery`, saved)
    }
  } catch {
    /* Persistence failures are surfaced by the first guarded write. */
  }
  return { document, past: [], future: [], editedBlock: null }
}
function historyReducer(state: History, event: HistoryAction): History {
  // Undo/redo is an in-memory editing history; it is reset when a document is loaded.
  if (event.type === "external")
    return { document: event.document, past: [], future: [], editedBlock: null }
  if (event.type === "undo") {
    const previous = state.past.at(-1)
    return previous
      ? {
          document: previous,
          past: state.past.slice(0, -1),
          future: [state.document, ...state.future],
          editedBlock: null,
        }
      : state
  }
  if (event.type === "redo") {
    const next = state.future[0]
    return next
      ? {
          document: next,
          past: [...state.past, state.document].slice(-40),
          future: state.future.slice(1),
          editedBlock: null,
        }
      : state
  }
  const document = reduceDocument(state.document, event.action)
  if (document === state.document) return state
  const editedBlock = event.action.type === "update" ? event.action.id : null
  const coalesce = editedBlock !== null && editedBlock === state.editedBlock
  return {
    document,
    past: coalesce ? state.past : [...state.past, state.document].slice(-40),
    future: [],
    editedBlock,
  }
}
export function useBuilder() {
  const { projectId: routeId } = useParams()
  const { user, accessToken } = useAuth()
  const { selectedOrganization } = useOrganization()
  const localDraftKey = user && selectedOrganization
    ? builderDraftStorageKey(user.id, selectedOrganization.id)
    : null
  const [history, send] = useReducer(historyReducer, localDraftKey, restore)
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<{ id: string; revision: number } | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!routeId)
  const [conflict, setConflict] = useState(false)
  const [retrySave, setRetrySave] = useState(0)
  const inFlight = useRef(false)
  const documentRef = useRef(history.document)
  const projectRef = useRef(project)
  useEffect(() => { documentRef.current = history.document }, [history.document])
  useEffect(() => { projectRef.current = project }, [project])
  const [savedDocument, setSavedDocument] = useState<BuilderDocument | null>(
    null
  )
  // Identity marks the exact document confirmed by local storage or the server.
  // Edits made while a request is pending remain dirty after that request succeeds.
  const { document } = history
  const dispatch = useCallback(
    (action: Action) => send({ type: "apply", action }),
    []
  )
  const undo = useCallback(() => send({ type: "undo" }), [])
  const redo = useCallback(() => send({ type: "redo" }), [])
  const adoptTemplateRegions = useCallback(async (
    templateId: string,
    versionId: string,
    regions: Array<"navbar" | "footer">,
  ) => {
    const currentProject = projectRef.current
    const currentDocument = documentRef.current
    if (!currentProject || !accessToken) throw new Error("Abra um projeto salvo para adotar estas áreas.")
    if (inFlight.current) throw new Error("Aguarde o salvamento atual antes de adotar as áreas.")
    inFlight.current = true
    setSaving(true)
    setSaveError("")
    try {
      let revision = currentProject.revision
      if (savedDocument !== currentDocument) {
        const saved = await updateProject(accessToken, currentProject.id, revision, currentDocument)
        revision = saved.revision
        setProject({ id: saved.id, revision: saved.revision })
        setSavedDocument(currentDocument)
      }
      const result = await adoptProjectTemplateRegions(accessToken, currentProject.id,
        revision, templateId, versionId, regions)
      const adopted = parseDocument(JSON.stringify(result.document))
      if (!adopted) throw new Error("Não foi possível atualizar as áreas compartilhadas. Tente novamente.")
      const latest = documentRef.current
      const merged = latest === currentDocument ? adopted : {
        ...latest,
        navbar: adopted.navbar,
        footer: adopted.footer,
        regionOrigins: adopted.regionOrigins,
      }
      send({ type: "external", document: merged })
      setProject({ id: result.id, revision: result.revision })
      setSavedDocument(adopted)
    } catch (error) {
      if (error instanceof ProjectError && error.status === 409) setConflict(true)
      setSaveError(error instanceof Error ? error.message : "Não foi possível adotar as áreas do modelo.")
      throw error
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }, [accessToken, savedDocument])
  useEffect(() => {
    if (!routeId || !accessToken || !user || !selectedOrganization
      || (routeId === loadedId && projectRef.current?.id === routeId)) return
    let active = true
    setLoading(true)
    setLoadedId(null)
    setProject(null)
    getProject(accessToken, routeId).then((result) => {
      if (!active) return
      const parsed = parseDocument(JSON.stringify(result.document))
      if (!parsed) throw new Error("Documento do projeto inválido.")
      const key = projectDraftStorageKey(user.id, routeId)
      const draft = localStorage.getItem(key)
      const restored = draft ? parseDocument(draft) : null
      send({ type: "external", document: restored ?? parsed })
      setSavedDocument(parsed)
      setProject({ id: result.id, revision: result.revision })
      setLoadedId(routeId)
      setSaveError("")
      setLoading(false)
    }).catch((error) => {
      if (active) { setSaveError(error instanceof Error ? error.message : "Não foi possível abrir o projeto."); setLoading(false) }
    })
    return () => { active = false }
  }, [routeId, accessToken, user, selectedOrganization, loadedId])
  const loadServerVersion = useCallback(async () => {
    if (!project || !accessToken || !user || !selectedOrganization) return
    const result = await getProject(accessToken, project.id)
    const parsed = parseDocument(JSON.stringify(result.document))
    if (!parsed) throw new Error("Documento do projeto inválido.")
    const key = projectDraftStorageKey(user.id, project.id)
    try {
      const draft = localStorage.getItem(key)
      if (draft) localStorage.setItem(`${key}:conflict-recovery`, draft)
      localStorage.removeItem(key)
    } catch { /* Browser storage may be unavailable; the open editor still holds the draft. */ }
    send({ type: "external", document: parsed })
    setProject({ id: result.id, revision: result.revision })
    setSavedDocument(parsed)
    setConflict(false)
    setSaveError("")
  }, [project, accessToken, user, selectedOrganization])
  useEffect(() => {
    if (routeId || project || !localDraftKey) return
    const save = () => {
      try {
        const serialized = JSON.stringify(document)
        if (localStorage.getItem(localDraftKey) !== serialized)
          localStorage.setItem(localDraftKey, serialized)
        setSavedDocument(document)
        setSaveError("")
      } catch {
        setSaveError(
          "O armazenamento do navegador está indisponível. Baixe seu projeto antes de sair."
        )
      }
    }
    const timer = setTimeout(save, 100)
    window.addEventListener("pagehide", save)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("pagehide", save)
    }
  }, [document, routeId, project, localDraftKey])
  useEffect(() => {
    if (!project || !user || !selectedOrganization || !accessToken || loadedId !== project.id || conflict || savedDocument === document) return
    const key = projectDraftStorageKey(user.id, project.id)
    try { localStorage.setItem(key, JSON.stringify(document)) } catch { window.setTimeout(() => setSaveError("Não foi possível manter o rascunho local."), 0) }
    const timer = window.setTimeout(async () => {
      if (inFlight.current) return
      inFlight.current = true
      setSaving(true)
      const documentToSave = documentRef.current
      try {
        const result = await updateProject(accessToken, project.id, project.revision, documentToSave)
        setProject({ id: result.id, revision: result.revision })
        setSavedDocument(documentToSave)
        setSaveError("")
        if (documentRef.current === documentToSave) localStorage.removeItem(key)
      } catch (error) {
        if (error instanceof ProjectError && error.status === 409) setConflict(true)
        else window.setTimeout(() => setRetrySave(value => value + 1), 5000)
        setSaveError(error instanceof Error ? error.message : "Não foi possível salvar o projeto.")
      } finally { inFlight.current = false; setSaving(false) }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [document, project, user, selectedOrganization, accessToken, loadedId, conflict, savedDocument, retrySave])
  useEffect(() => {
    function receive(event: StorageEvent) {
      if (routeId || event.key !== localDraftKey || !event.newValue) return
      const document = parseDocument(event.newValue)
      if (document) send({ type: "external", document })
    }
    window.addEventListener("storage", receive)
    return () => window.removeEventListener("storage", receive)
  }, [routeId, localDraftKey])
  useEffect(() => {
    if (!saveError) return
    function guard(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", guard)
    return () => window.removeEventListener("beforeunload", guard)
  }, [saveError])
  return {
    document,
    project,
    accessToken,
    loading,
    loadFailed: !!routeId && !loading && loadedId !== routeId,
    conflict,
    loadServerVersion,
    dispatch,
    adoptTemplateRegions,
    saveError,
    saveStatus: saveError ? "error" as const : saving ? "saving" as const : savedDocument === document ? "up-to-date" as const : "draft" as const,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
