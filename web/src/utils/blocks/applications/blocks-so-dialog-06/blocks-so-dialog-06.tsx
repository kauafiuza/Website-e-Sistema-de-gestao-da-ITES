import { useId, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

export function BlocksSoDialog06Block({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const [open, setOpen] = useState(false)
  const [privateWorkspace, setPrivateWorkspace] = useState(false)
  const [notice, setNotice] = useState("")
  const inputId = useId()
  const privacyId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOpen(false)
    setNotice("Workspace configurado apenas nesta demonstração local.")
  }

  return (
    <section className="builder-block bg-background">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button className="pointer-events-auto" data-inline-editor-control="" />}>
          <InlineText editor={editor} target={{ kind: "property", key: "button" }} value={p.button} label="texto para abrir a configuração" focusable={false} />
        </DialogTrigger>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-5">
            <DialogTitle><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título do diálogo" /></DialogTitle>
            <DialogDescription><InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição do diálogo" multiline /></DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="px-6 pb-5">
              <Label htmlFor={inputId}>Nome do workspace <span className="text-destructive">*</span></Label>
              <Input className="mt-2" id={inputId} name="workspace" placeholder="Meu espaço de trabalho" required />
              <Button className="mt-4 w-full pointer-events-auto" data-inline-editor-control="" type="submit">Criar workspace</Button>
            </div>
            <div className="flex items-start gap-3 border-t bg-muted px-6 py-4">
              <Switch checked={privateWorkspace} id={privacyId} onCheckedChange={setPrivateWorkspace} />
              <div>
                <Label htmlFor={privacyId}>Manter workspace privado</Label>
                <p className="text-sm text-muted-foreground">Somente pessoas convidadas poderão acessar.</p>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {notice ? <p className="mt-3 text-sm text-muted-foreground" role="status">{notice}</p> : null}
    </section>
  )
}
