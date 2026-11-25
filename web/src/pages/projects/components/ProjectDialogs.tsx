import type { FormEvent } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ProjectSummary } from "@/types/auth/project.types"

type Props = {
  mode: "create" | "rename" | null
  target: ProjectSummary | null
  name: string
  busy: boolean
  error: string
  onNameChange: (name: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDelete: () => void
  onCloseForm: () => void
  onCloseDelete: () => void
}

export function ProjectDialogs({
  mode,
  target,
  name,
  busy,
  error,
  onNameChange,
  onSubmit,
  onDelete,
  onCloseForm,
  onCloseDelete,
}: Props) {
  return (
    <>
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !busy) onCloseForm()
        }}
      >
        <DialogContent>
          <DialogTitle>
            {mode === "create" ? "Novo projeto" : "Renomear projeto"}
          </DialogTitle>
          <DialogDescription>
            Escolha um nome que facilite encontrar o projeto depois.
          </DialogDescription>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="project-name">Nome do projeto</FieldLabel>
                <Input
                  id="project-name"
                  name="project-name"
                  autoComplete="off"
                  value={name}
                  maxLength={150}
                  aria-invalid={!!error}
                  aria-describedby={error ? "project-name-error" : undefined}
                  onChange={(event) => onNameChange(event.target.value)}
                  required
                />
                {error ? (
                  <p
                    id="project-name-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={busy}>
              {busy
                ? "Salvando…"
                : mode === "create"
                  ? "Criar projeto"
                  : "Salvar nome"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!target && mode === null}
        onOpenChange={(open) => {
          if (!open && !busy) onCloseDelete()
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Excluir “{target?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            O projeto e seu documento salvo serão excluídos permanentemente.
          </AlertDialogDescription>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                onDelete()
              }}
            >
              {busy ? "Excluindo…" : "Excluir projeto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
