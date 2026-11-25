import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SavedTheme } from "@/services/projects/theme.service"

interface ThemeDeleteDialogProps {
  deleteTarget: SavedTheme | null
  deleting: boolean
  onClose: () => void
  onDelete: () => void
}

export function ThemeDeleteDialog({
  deleteTarget,
  deleting,
  onClose,
  onDelete,
}: ThemeDeleteDialogProps) {
  return (
    <Dialog
      open={Boolean(deleteTarget)}
      onOpenChange={(open) => {
        if (!open && !deleting) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir “{deleteTarget?.name}”?</DialogTitle>
          <DialogDescription>
            O tema será removido da sua biblioteca. Temas usados por projetos
            não podem ser excluídos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={deleting} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={deleting} onClick={onDelete}>
            {deleting ? "Excluindo…" : "Excluir tema"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
