import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/motion/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SavedTheme } from "@/services/projects/theme.service"

interface ThemeRenameDialogProps {
  theme: SavedTheme | null
  saving: boolean
  error: string
  onClose: () => void
  onRename: (name: string) => void
}

export function ThemeRenameDialog({
  theme,
  saving,
  error,
  onClose,
  onRename,
}: ThemeRenameDialogProps) {
  const [name, setName] = useState(theme?.name ?? "")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim()
    if (normalizedName) onRename(normalizedName)
  }

  return (
    <Dialog
      open={Boolean(theme)}
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Renomear tema</DialogTitle>
            <DialogDescription>
              Escolha um novo nome para “{theme?.name}”.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Nome do tema"
            value={name}
            onChange={setName}
            maxLength={80}
            required
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Salvando…" : "Salvar nome"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
