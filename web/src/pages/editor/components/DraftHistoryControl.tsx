import { useEffect, useState } from "react"
import { History, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  listProjectRevisions,
  restoreProjectRevision,
  type DraftRevision,
} from "@/services/projects/project.service"
import type { PageResponse } from "@/types/api/pagination"

interface Props {
  token: string | null
  projectId?: string
  projectRevision?: number
  persisted: boolean
  saveStatus: "error" | "saving" | "draft" | "up-to-date"
  onRestored: () => Promise<void>
}

export function DraftHistoryControl({
  token,
  projectId,
  projectRevision,
  persisted,
  saveStatus,
  onRestored,
}: Props) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [history, setHistory] = useState<PageResponse<DraftRevision> | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selected, setSelected] = useState<DraftRevision | null>(null)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || !token || !projectId) return
    let active = true
    void listProjectRevisions(token, projectId, page)
      .then((result) => { if (active) { setHistory(result); setError("") } })
      .catch(() => { if (active) setError("Não foi possível carregar o histórico.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, page, projectId, refreshKey, token])

  async function restore() {
    if (!token || !projectId || !selected || saveStatus !== "up-to-date" || restoring) return
    setRestoring(true)
    setError("")
    try {
      await restoreProjectRevision(token, projectId, selected.id)
      await onRestored()
      setSelected(null)
      setPage(0)
      setLoading(true)
      setRefreshKey((value) => value + 1)
    } catch {
      setError("Não foi possível restaurar esta versão. Atualize o editor e tente novamente.")
    } finally {
      setRestoring(false)
    }
  }

  if (!persisted || !projectId) return null

  return <>
    <Button variant="secondary" size="sm" onClick={() => {
      setError("")
      setLoading(true)
      setPage(0)
      setRefreshKey((value) => value + 1)
      setOpen(true)
    }}>
      <History aria-hidden="true" />
      <span className="hidden lg:inline">Histórico</span>
      <span className="sr-only lg:hidden">Histórico de versões</span>
    </Button>
    <Dialog open={open} onOpenChange={(next) => { if (!restoring) setOpen(next) }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Histórico de versões</DialogTitle>
          <DialogDescription>Consulte versões salvas do projeto e restaure uma delas. A versão atual será mantida no histórico.</DialogDescription>
        </DialogHeader>
        {error && <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => { setLoading(true); setRefreshKey((value) => value + 1) }}>
            Tentar novamente
          </Button>
        </div>}
        {saveStatus !== "up-to-date" && <p className="text-sm text-amber-700">Salve as alterações atuais antes de restaurar uma versão.</p>}
        <ScrollArea className="max-h-[min(60vh,28rem)] pr-3">
          {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Carregando histórico…</p>
            : history?.items.length ? <ol className="divide-y">
              {history.items.map((revision) => {
                const current = revision.revision === projectRevision
                return <li key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">Versão {revision.revision}{current ? " · Atual" : ""}</p>
                    <time dateTime={revision.createdAt} className="text-sm text-muted-foreground">
                      {new Date(revision.createdAt).toLocaleString("pt-BR")}
                    </time>
                  </div>
                  {!current && <Button variant="outline" size="sm" disabled={saveStatus !== "up-to-date" || restoring}
                    onClick={() => { setError(""); setSelected(revision) }}>
                    <RotateCcw aria-hidden="true" /> Restaurar versão {revision.revision}
                  </Button>}
                </li>
              })}
            </ol> : !error && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma versão encontrada.</p>}
        </ScrollArea>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{history?.totalElements ?? 0} versões</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!history?.hasPrevious || loading || restoring} onClick={() => { setLoading(true); setPage((value) => value - 1) }}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={!history?.hasNext || loading || restoring} onClick={() => { setLoading(true); setPage((value) => value + 1) }}>Próxima</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={selected !== null} onOpenChange={(next) => { if (!next && !restoring) setSelected(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restaurar versão {selected?.revision}?</AlertDialogTitle>
          <AlertDialogDescription>A versão atual será salva no histórico e o conteúdo escolhido passará a ser a nova versão do projeto.</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={restoring}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={restoring || saveStatus !== "up-to-date"} onClick={(event) => { event.preventDefault(); void restore() }}>
            {restoring ? "Restaurando…" : `Restaurar versão ${selected?.revision}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
}
