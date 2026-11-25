import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { lazy, Suspense, useId, type Dispatch } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { PropertyEditor } from "./PropertyEditor"
const ExportDialog = lazy(() => import("./ExportDialog"))
import type { Block, Action, BuilderDocument } from "../lib/document"
export interface Confirmation {
  type: "clear" | "delete"
  id?: string
}
interface Props {
  document: BuilderDocument
  selected: Block | undefined
  dispatch: Dispatch<Action>
  exportOpen: boolean
  setExportOpen: (value: boolean) => void
  setEditId: (value: string | null) => void
  renameId: string | null
  setRenameId: (value: string | null) => void
  name: string
  setName: (value: string) => void
  confirm: Confirmation | null
  setConfirm: (value: Confirmation | null) => void
}
export function BuilderDialogs({
  document,
  selected,
  dispatch,
  exportOpen,
  setExportOpen,
  setEditId,
  renameId,
  setRenameId,
  name,
  setName,
  confirm,
  setConfirm,
}: Props) {
  const nameId = useId()
  return (
    <>
      {exportOpen && (
        <Suspense
          fallback={
            <p
              role="status"
              className="fixed bottom-10 left-1/2 z-50 bg-background p-3"
            >
              Preparando exportação…
            </p>
          }
        >
          <ExportDialog
            document={document}
            setExportOpen={setExportOpen}
          />
        </Suspense>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setEditId(null)
        }}
      >
        <DialogContent className="builder-ui glass-elevated flex h-[min(92dvh,900px)] w-[min(96vw,1180px)] max-w-none flex-col gap-4 overflow-hidden p-4 sm:max-w-[min(96vw,1180px)] sm:p-7">
          <DialogHeader className="shrink-0 pr-10">
            <DialogTitle className="text-lg">Propriedades do bloco</DialogTitle>
            <DialogDescription>
              Ajuste conteúdo, aparência e comportamento. As alterações são salvas automaticamente.
            </DialogDescription>
          </DialogHeader>
          {selected && <PropertyEditor block={selected} dispatch={dispatch} pages={document.pages} />}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!renameId}
        onOpenChange={(open) => {
          if (!open) setRenameId(null)
        }}
      >
        <DialogContent className="builder-ui glass-elevated">
          <DialogTitle>Renomear página</DialogTitle>
          <DialogDescription>Escolha um nome para esta página.</DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (renameId) dispatch({ type: "rename", id: renameId, name })
              setRenameId(null)
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={nameId}>Nome da página</FieldLabel>
                <Input
                  id={nameId}
                  aria-label="Nome da página"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                />
              </Field>
              <Button type="submit">Salvar nome</Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent className="builder-ui glass-elevated">
          <AlertDialogTitle>
            {confirm?.type === "clear"
              ? "Limpar esta página?"
              : "Excluir esta página?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Isso remove{" "}
            {confirm?.type === "clear"
              ? "todas as seções da página atual"
              : "a página e suas seções"}
            . As outras páginas são mantidas. Use Desfazer para restaurar esta alteração.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirm(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirm?.type === "clear") dispatch({ type: "clear" })
                else if (confirm?.id)
                  dispatch({ type: "delete", id: confirm.id })
                setConfirm(null)
              }}
            >
              Confirmar {confirm?.type === "clear" ? "limpeza" : "exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
