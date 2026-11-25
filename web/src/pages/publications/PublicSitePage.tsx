import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import { PageContent } from "@/pages/editor/components/PageContent"
import { defaultProjectTheme, themeVariables } from "@/pages/editor/lib/project-theme"
import type { PublicPage } from "@/services/projects/publication.service"
import { parsePublishedThemePreference, publishedThemeStorageKey, resolvePublishedThemeMode } from "./lib/published-theme"

const fallbackTheme = defaultProjectTheme()

export default function PublicSitePage() {
  const { key = "" } = useParams()
  const location = useLocation()
  const [page, setPage] = useState<PublicPage | null>(null)
  const [error, setError] = useState(false)
  const [storedPreference, setStoredPreference] = useState(() => ({
    key,
    value: parsePublishedThemePreference(localStorage.getItem(publishedThemeStorageKey(key))),
  }))
  const preference = storedPreference.key === key
    ? storedPreference.value
    : parsePublishedThemePreference(localStorage.getItem(publishedThemeStorageKey(key)))
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches)
  const mode = resolvePublishedThemeMode(preference, systemDark)
  const publishedTheme = page?.document.theme ?? fallbackTheme
  const activeTheme = useMemo(() => ({ ...publishedTheme, mode }), [publishedTheme, mode])
  useEffect(() => {
    const storageKey = publishedThemeStorageKey(key)
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setStoredPreference({ key, value: parsePublishedThemePreference(event.newValue) })
      }
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onSystemChange = () => setSystemDark(media.matches)
    const onToggleTheme = () => {
      const next = document.documentElement.classList.contains("dark") ? "light" : "dark"
      localStorage.setItem(storageKey, next)
      setStoredPreference({ key, value: next })
    }
    media.addEventListener("change", onSystemChange)
    window.addEventListener("storage", onStorage)
    window.addEventListener("builder:toggle-theme", onToggleTheme)
    return () => {
      media.removeEventListener("change", onSystemChange)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("builder:toggle-theme", onToggleTheme)
    }
  }, [key])
  useLayoutEffect(() => {
    if (!page || error) return
    const root = document.documentElement
    const variables = themeVariables(activeTheme)
    const previous = Object.entries(variables).map(([name, value]) => {
      const property = name === "colorScheme" ? "color-scheme" : name
      const original = root.style.getPropertyValue(property)
      root.style.setProperty(property, String(value))
      return [property, original] as const
    })
    const previousMode = root.classList.contains("dark") ? "dark" : "light"
    root.classList.remove("light", "dark")
    root.classList.add(mode)
    return () => {
      for (const [property, value] of previous) {
        if (value) root.style.setProperty(property, value)
        else root.style.removeProperty(property)
      }
      root.classList.remove("light", "dark")
      root.classList.add(previousMode)
    }
  }, [page, error, mode, activeTheme])
  useEffect(() => {
    let current = true
    const path = location.pathname.slice(`/p/${key}`.length)
    fetch(`/api/public/${encodeURIComponent(key)}${path}`)
      .then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<PublicPage> })
      .then((result) => { if (current) { setPage(result); setError(false) } })
      .catch(() => { if (current) setError(true) })
    return () => { current = false }
  }, [key, location.pathname])
  if (error) return <main className="grid min-h-svh place-items-center">Página não encontrada.</main>
  if (!page) return <main className="grid min-h-svh place-items-center">Carregando página…</main>
  const selected = page.document.pages.find((item) => item.id === page.pageId)
  if (!selected) return <main className="grid min-h-svh place-items-center">Página não encontrada.</main>
  async function submitForm(event: React.FormEvent<HTMLElement>) {
    const form = event.target as HTMLFormElement
    const blockId = form.closest<HTMLElement>("[data-block-id]")?.dataset.blockId
    if (!blockId || !page || !["form-classic", "contact-classic", "contact-panel", "waitlist-classic", "demo-request"].includes(
      page.document.pages.find((item) => item.id === page.pageId)?.blocks.find((block) => block.id === blockId)?.definitionId ?? ""
    )) return
    event.preventDefault()
    event.stopPropagation()
    const formReference = page.formReferences.find((reference) =>
      reference.pageId === page.pageId && reference.blockId === blockId)
    let status = form.querySelector<HTMLElement>("[data-submission-status]")
    if (!status) {
      status = document.createElement("p")
      status.dataset.submissionStatus = "true"
      status.setAttribute("role", "status")
      status.className = "mt-3 text-sm"
      form.append(status)
    }
    if (!formReference) {
      status.textContent = "Este formulário não está disponível. Atualize a página e tente novamente."
      return
    }
    if (form.dataset.submitting === "true") return
    const fields = Object.fromEntries(new FormData(form).entries())
    if (Object.values(fields).some((value) => typeof value !== "string")) return
    form.dataset.submitting = "true"
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (button) button.disabled = true
    status.textContent = "Enviando…"
    try {
      const response = await fetch(`/api/public/${encodeURIComponent(key)}/submissions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.pageId, blockId, version: page.version,
          formVersionId: formReference.formVersionId, fields }),
      })
      if (!response.ok) throw new Error()
      form.reset()
      status.textContent = "Recebemos sua resposta. Obrigado!"
    } catch {
      status.textContent = "Não foi possível enviar. Tente novamente."
    } finally {
      delete form.dataset.submitting
      if (button) button.disabled = false
    }
  }
  function record(type: "click" | "interaction", target: string) {
    void fetch(`/api/public/${encodeURIComponent(key)}/interaction`, {
      method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, path: location.pathname.slice(`/p/${key}`.length), target }),
    })
  }
  return <main className="builder-authored-content min-h-svh bg-background" style={themeVariables(activeTheme)} onClick={(event) => {
    const element = (event.target as HTMLElement).closest("a, button, input, select, textarea")
    if (element) record("click", `${element.tagName.toLowerCase()}: ${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 120)}`)
  }} onSubmitCapture={(event) => { void submitForm(event) }}>
    <PageContent page={selected} navbar={page.document.navbar} footer={page.document.footer} document={page.document} projectId={`p/${key}`} routeSearch={location.search} />
  </main>
}
