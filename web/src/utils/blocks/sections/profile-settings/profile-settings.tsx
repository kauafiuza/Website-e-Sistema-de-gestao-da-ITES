import { useEffect, useState, type FormEvent } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { BlockProps } from "@/utils/blocks/types"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"

export function ProfileSettingsBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const fields = p.items ?? []
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((item) => [item.id, item.description])),
  )
  const [photo, setPhoto] = useState("")
  const [uploadError, setUploadError] = useState(false)
  const [saved, setSaved] = useState(false)
  const name = fields.find((item) => item.id === "profile-name")?.description ?? "U"
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    if (!photo) return
    return () => URL.revokeObjectURL(photo)
  }, [photo])

  const update = (id: string, value: string) => {
    setValues((current) => ({ ...current, [id]: value }))
    setSaved(false)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(true)
  }

  const reset = () => {
    setValues(Object.fromEntries(fields.map((item) => [item.id, item.description])))
    setPhoto("")
    setUploadError(false)
    setSaved(false)
  }

  return (
    <section className="builder-block builder-block--spacious bg-background">
      <form onSubmit={submit} className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título"
              />
            </CardTitle>
            <CardDescription>
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "description" }}
                value={p.description}
                label="descrição"
              />
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <InlineImage
                editor={editor}
                url={p.imageUrl ?? ""}
                alt={p.imageAlt ?? ""}
                target={{ kind: "property", key: "imageUrl" }}
                altTarget={{ kind: "property", key: "imageAlt" }}
                className="size-20 shrink-0 rounded-full"
              >
                <Avatar className="size-20">
                  <AvatarImage
                    src={photo || p.imageUrl}
                    alt={p.imageAlt || "Foto de perfil"}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </InlineImage>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Foto de perfil</p>
                <label className="pointer-events-auto relative w-fit cursor-pointer text-xs font-medium text-primary underline-offset-4 hover:underline">
                  <span>Enviar uma nova foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Enviar foto de perfil"
                    data-inline-editor-control=""
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
                        setUploadError(true)
                        return
                      }
                      setPhoto(URL.createObjectURL(file))
                      setUploadError(false)
                      setSaved(false)
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG ou GIF · até 2 MB.
                </p>
                {uploadError ? (
                  <p role="alert" className="text-xs text-destructive">
                    Selecione uma imagem de até 2 MB.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 @sm:grid-cols-2">
              {fields
                .filter((item) => item.value === "identity")
                .map((field) => (
                  <div key={field.id} className="flex flex-col gap-2">
                    <Label htmlFor={field.id}>
                      <InlineText
                        editor={editor}
                        target={{ kind: "item", id: field.id, key: "title" }}
                        value={field.title}
                        label="rótulo do campo"
                      />
                    </Label>
                    <Input
                      id={field.id}
                      type={field.href}
                      value={values[field.id] ?? ""}
                      onChange={(event) => update(field.id, event.target.value)}
                      placeholder={field.features[0]}
                    />
                  </div>
                ))}
            </div>
            {fields
              .filter((item) => item.value === "bio")
              .map((field) => (
                <div key={field.id} className="flex flex-col gap-2">
                  <Label htmlFor={field.id}>
                    <InlineText
                      editor={editor}
                      target={{ kind: "item", id: field.id, key: "title" }}
                      value={field.title}
                      label="rótulo do campo"
                    />
                  </Label>
                  <Textarea
                    id={field.id}
                    rows={4}
                    maxLength={160}
                    value={values[field.id] ?? ""}
                    onChange={(event) => update(field.id, event.target.value)}
                    placeholder={field.features[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    {values[field.id]?.length ?? 0}/160 caracteres
                  </p>
                </div>
              ))}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button type="reset" variant="outline" onClick={reset}>
              Cancelar
            </Button>
            <Button type="submit">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "button" }}
                value={p.button}
                label="texto do botão"
                focusable={false}
              />
            </Button>
          </CardFooter>
        </Card>
        {saved ? (
          <p role="status" className="mt-3 text-right text-sm text-muted-foreground">
            Alterações salvas nesta prévia.
          </p>
        ) : null}
      </form>
    </section>
  )
}
