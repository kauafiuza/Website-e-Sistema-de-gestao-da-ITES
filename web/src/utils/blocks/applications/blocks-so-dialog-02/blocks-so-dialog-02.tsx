import { Check } from "lucide-react"
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
import {
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

export function BlocksSoDialog02Block({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  return (
    <section className="builder-block bg-background">
      <Dialog>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="pointer-events-auto"
              data-inline-editor-control=""
            />
          }
        >
          <InlineText
            editor={editor}
            target={{ kind: "property", key: "button" }}
            value={p.button}
            label="texto para abrir a confirmação"
            focusable={false}
          />
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <div className="flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Check aria-hidden="true" className="size-6" />
            </div>
          </div>
          <DialogHeader className="gap-0 text-center">
            <DialogTitle className="text-balance text-center">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título do diálogo"
              />
            </DialogTitle>
            <DialogDescription className="mx-auto mt-2 text-pretty text-center sm:max-w-[90%]">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "description" }}
                value={p.description}
                label="descrição do diálogo"
                multiline
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3">
            <DialogClose
              render={
                <Button
                  className="pointer-events-auto w-full sm:flex-1"
                  data-inline-editor-control=""
                />
              }
            >
              Continuar
            </DialogClose>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  className="pointer-events-auto w-full sm:flex-1"
                  data-inline-editor-control=""
                />
              }
            >
              Voltar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
