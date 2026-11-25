import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  createTheme,
  deleteTheme,
  listThemes,
  updateTheme as updateSavedTheme,
  type SavedTheme,
} from "@/services/projects/theme.service"
import {
  defaultProjectTheme,
  type ColorKey,
  type ProjectTheme,
} from "@/pages/editor/lib/project-theme"
import {
  isThemeDirty,
  presetTheme,
  savedThemeDraft,
  updateThemeColor,
} from "./theme-lab"

export function useThemeLab(
  accessToken: string | null | undefined,
  autoCreateDraft: boolean
) {
  const [theme, setTheme] = useState<ProjectTheme>(() => defaultProjectTheme())
  const [savedTheme, setSavedTheme] = useState<ProjectTheme>(() =>
    defaultProjectTheme()
  )
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([])
  const [savedThemesPage, setSavedThemesPage] = useState(0)
  const [hasMoreThemes, setHasMoreThemes] = useState(false)
  const [loadingMoreThemes, setLoadingMoreThemes] = useState(false)
  const loadingMoreThemesRef = useRef(false)
  const [loadedThemesToken, setLoadedThemesToken] = useState<string | null>(null)
  const [themeError, setThemeError] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editVersion, setEditVersion] = useState(0)
  const themeRef = useRef(theme)
  const selectionVersionRef = useRef(0)
  const draftBaseNameRef = useRef(theme.preset)
  const creationInFlightRef = useRef(false)

  const dirty = useMemo(
    () => isThemeDirty(theme, savedTheme),
    [theme, savedTheme]
  )
  const loadingThemes = Boolean(accessToken) && loadedThemesToken !== accessToken

  useEffect(() => {
    if (!accessToken) return

    let active = true
    listThemes(accessToken, 0, 20)
      .then((response) => {
        if (active) {
          setSavedThemes(response.items)
          setSavedThemesPage(response.page)
          setHasMoreThemes(response.hasNext)
          setThemeError("")
        }
      })
      .catch(() => {
        if (active) setThemeError("Não foi possível carregar seus presets.")
      })
      .finally(() => {
        if (active) setLoadedThemesToken(accessToken)
      })

    return () => {
      active = false
    }
  }, [accessToken])

  const loadMoreThemes = useCallback(async () => {
    if (!accessToken || !hasMoreThemes || loadingMoreThemesRef.current) return
    loadingMoreThemesRef.current = true
    setLoadingMoreThemes(true)
    try {
      const response = await listThemes(accessToken, savedThemesPage + 1, 20)
      setSavedThemes((current) => {
        const existing = new Set(current.map((item) => item.id))
        return [...current, ...response.items.filter((item) => !existing.has(item.id))]
      })
      setSavedThemesPage(response.page)
      setHasMoreThemes(response.hasNext)
    } catch {
      setThemeError("Não foi possível carregar mais temas.")
    } finally {
      loadingMoreThemesRef.current = false
      setLoadingMoreThemes(false)
    }
  }, [accessToken, hasMoreThemes, savedThemesPage])

  const updateTheme = useCallback((changes: Partial<ProjectTheme>) => {
    const current = themeRef.current
    const next = { ...current, ...changes }
    if (!current.presetId && Object.keys(changes).some((key) => key !== "mode")) {
      next.preset = "Custom"
    }
    themeRef.current = next
    setTheme(next)
    setEditVersion((version) => version + 1)
  }, [])

  const setColor = useCallback((key: ColorKey, value: string) => {
    const next = updateThemeColor(themeRef.current, key, value)
    if (next === themeRef.current) return
    themeRef.current = next
    setTheme(next)
    setEditVersion((version) => version + 1)
  }, [])

  const selectPreset = useCallback((name: string) => {
    selectionVersionRef.current += 1
    draftBaseNameRef.current = name
    const next = presetTheme(themeRef.current, name)
    themeRef.current = next
    setTheme(next)
    setSavedTheme(defaultProjectTheme())
    setEditVersion(0)
  }, [])

  const loadSavedTheme = useCallback((item: SavedTheme) => {
    selectionVersionRef.current += 1
    const loaded = savedThemeDraft(item)
    themeRef.current = loaded
    draftBaseNameRef.current = item.name
    setTheme(loaded)
    setSavedTheme(loaded)
    setEditVersion(0)
    setThemeError("")
  }, [])

  useEffect(() => {
    if (!accessToken || loadingThemes || editVersion === 0 || !dirty) return
    const selectedId = theme.presetId
    if (!selectedId && !autoCreateDraft) return
    const selectionVersion = selectionVersionRef.current
    const timer = window.setTimeout(() => {
      const save = async () => {
        let creatingDraft = false
        setSaving(true)
        try {
          if (selectedId) {
            const updated = await updateSavedTheme(accessToken, {
              id: selectedId,
              name: theme.preset,
              configuration: theme,
            })
            setSavedThemes((current) =>
              current.map((item) => item.id === updated.id ? updated : item)
            )
            if (themeRef.current.presetId === updated.id) {
              const persisted = savedThemeDraft(updated)
              setSavedTheme(persisted)
              if (themeRef.current.preset !== updated.name) {
                const next = { ...themeRef.current, preset: updated.name }
                themeRef.current = next
                setTheme(next)
              }
            }
          } else {
            if (creationInFlightRef.current) return
            creationInFlightRef.current = true
            creatingDraft = true
            const baseName = draftBaseNameRef.current === "Custom"
              ? "Meu tema"
              : `${draftBaseNameRef.current} personalizado`
            const existingNames = new Set(
              savedThemes.map((item) => item.name.toLocaleLowerCase())
            )
            let name = baseName.slice(0, 80)
            let suffix = 2
            while (existingNames.has(name.toLocaleLowerCase())) {
              const tail = ` (${suffix++})`
              name = `${baseName.slice(0, 80 - tail.length)}${tail}`
            }
            const created = await createTheme(accessToken, name, theme)
            setSavedThemes((current) => [
              created,
              ...current.filter((item) => item.id !== created.id),
            ])
            if (selectionVersionRef.current === selectionVersion) {
              const next = {
                ...themeRef.current,
                preset: created.name,
                presetId: created.id,
              }
              themeRef.current = next
              setTheme(next)
              setSavedTheme(savedThemeDraft(created))
            }
          }
          setThemeError("")
        } catch (error) {
          setThemeError(
            error instanceof Error
              ? error.message
              : "Não foi possível salvar o tema."
          )
        } finally {
          if (creatingDraft) creationInFlightRef.current = false
          setSaving(false)
        }
      }
      void save()
    }, 450)
    return () => window.clearTimeout(timer)
  }, [accessToken, autoCreateDraft, dirty, editVersion, loadingThemes, savedThemes, theme])

  const saveCurrentTheme = useCallback(async (requestedName?: string) => {
    if (!accessToken || saving || themeRef.current.presetId) return false
    setThemeError("")
    setSaving(true)
    try {
      const currentTheme = themeRef.current
      const baseName = requestedName ?? (draftBaseNameRef.current === "Custom"
        ? "Meu tema"
        : `${draftBaseNameRef.current} personalizado`)
      const existingNames = new Set(
        savedThemes.map((item) => item.name.toLocaleLowerCase())
      )
      let name = baseName.slice(0, 80)
      let suffix = 2
      while (!requestedName && existingNames.has(name.toLocaleLowerCase())) {
        const tail = ` (${suffix++})`
        name = `${baseName.slice(0, 80 - tail.length)}${tail}`
      }
      const created = await createTheme(accessToken, name, currentTheme)
      setSavedThemes((current) => [
        created,
        ...current.filter((item) => item.id !== created.id),
      ])
      const next = {
        ...themeRef.current,
        preset: created.name,
        presetId: created.id,
      }
      themeRef.current = next
      setTheme(next)
      setSavedTheme(savedThemeDraft(created))
      setEditVersion(0)
      setThemeError("")
      return true
    } catch (error) {
      setThemeError(
        error instanceof Error ? error.message : "Não foi possível salvar o tema."
      )
      return false
    } finally {
      setSaving(false)
    }
  }, [accessToken, saving, savedThemes])

  const renamePreset = useCallback(async (id: string, name: string) => {
    if (!accessToken || saving) return false
    const existing = savedThemes.find((item) => item.id === id)
    if (!existing) return false

    setSaving(true)
    try {
      const isSelected = themeRef.current.presetId === id
      const configuration = isSelected
        ? themeRef.current
        : existing.configuration
      const updated = await updateSavedTheme(accessToken, {
        id,
        name,
        configuration,
      })
      setSavedThemes((current) =>
        current.map((item) => item.id === id ? updated : item)
      )
      if (themeRef.current.presetId === id) {
        const next = { ...themeRef.current, preset: updated.name }
        themeRef.current = next
        setTheme(next)
        setSavedTheme(savedThemeDraft(updated))
      }
      setThemeError("")
      return true
    } catch (error) {
      setThemeError(
        error instanceof Error ? error.message : "Não foi possível renomear o tema."
      )
      return false
    } finally {
      setSaving(false)
    }
  }, [accessToken, saving, savedThemes])

  const removePreset = useCallback(
    async (id: string) => {
      if (!accessToken || deleting) return false
      setDeleting(true)
      try {
        await deleteTheme(accessToken, id)
        setSavedThemes((current) => current.filter((item) => item.id !== id))
        if (theme.presetId === id) {
          const next = {
            ...themeRef.current,
            preset: "Custom",
            presetId: undefined,
          }
          themeRef.current = next
          setTheme(next)
          setSavedTheme(defaultProjectTheme())
          draftBaseNameRef.current = "Meu tema"
          setEditVersion(0)
        }
        setThemeError("")
        return true
      } catch (error) {
        setThemeError(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o tema."
        )
        return false
      } finally {
        setDeleting(false)
      }
    },
    [accessToken, deleting, theme.presetId]
  )

  const resetTheme = useCallback(() => {
    selectionVersionRef.current += 1
    const base = defaultProjectTheme()
    themeRef.current = base
    draftBaseNameRef.current = base.preset
    setTheme(base)
    setSavedTheme(base)
    setEditVersion(0)
  }, [])

  return {
    dirty,
    deleting,
    loadingThemes,
    hasMoreThemes,
    loadingMoreThemes,
    loadMoreThemes,
    loadSavedTheme,
    removePreset,
    renamePreset,
    resetTheme,
    saving,
    savedThemes,
    saveCurrentTheme,
    selectPreset,
    setColor,
    theme,
    themeError,
    updateTheme,
  }
}
