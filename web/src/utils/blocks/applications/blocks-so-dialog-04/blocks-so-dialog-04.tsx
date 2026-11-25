import { useId, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

export function BlocksSoDialog04Block({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(p.eyebrow)
  const [notice, setNotice] = useState("")
  const inputId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOpen(false)
    setNotice("Alteração mantida nesta demonstração local.")
  }

  return (
    <section className="builder-block bg-background">
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setName(p.eyebrow)
          setOpen(nextOpen)
        }}
      >
        <div className="flex justify-center">
          <DialogTrigger render={<Button className="pointer-events-auto" data-inline-editor-control="" />}>
            <InlineText editor={editor} target={{ kind: "property", key: "button" }} value={p.button} label="texto para abrir a edição" focusable={false} />
          </DialogTrigger>
        </div>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título do diálogo" /></DialogTitle>
            <DialogDescription><InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição do diálogo" multiline /></DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor={inputId}>Nome de usuário</Label>
              <Input id={inputId} name="username" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" required />
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit" className="w-full pointer-events-auto" data-inline-editor-control="">Salvar nesta demonstração</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {notice ? <p className="mt-3 text-center text-sm text-muted-foreground" role="status">{notice}</p> : null}
    </section>
  )
}
