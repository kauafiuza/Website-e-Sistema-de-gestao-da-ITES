import { TriangleAlert } from "lucide-react"
import { useId, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

export function BlocksSoDialog03Block({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState("")
  const inputId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOpen(false)
    setNotice("Demonstração local concluída. Nenhuma conta foi alterada.")
  }

  return (
    <section className="builder-block bg-background">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant="destructive"
              className="pointer-events-auto"
              data-inline-editor-control=""
            />
          }
        >
          <InlineText editor={editor} target={{ kind: "property", key: "button" }} value={p.button} label="texto para abrir o aviso" focusable={false} />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300">
              <TriangleAlert aria-hidden="true" className="size-6" />
            </div>
            <DialogHeader>
              <DialogTitle><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título do diálogo" /></DialogTitle>
              <DialogDescription><InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição do diálogo" multiline /></DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor={inputId}>Senha para confirmar</Label>
              <Input id={inputId} name="passphrase" type="password" autoComplete="current-password" required />
            </div>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button variant="outline" className="pointer-events-auto" data-inline-editor-control="" />}>Cancelar</DialogClose>
              <Button type="submit" variant="destructive" className="pointer-events-auto" data-inline-editor-control="">Confirmar demonstração</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {notice ? <p className="mt-3 text-sm text-muted-foreground" role="status">{notice}</p> : null}
    </section>
  )
}
