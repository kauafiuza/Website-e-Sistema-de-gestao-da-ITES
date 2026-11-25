import { useId } from "react"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FormField } from "@/utils/blocks/types"

export const defaultFormFields: Record<string, FormField[]> = {
  "form-classic": [{ id: "name", label: "Seu nome", type: "text", required: true }, { id: "email", label: "E-mail", type: "email", required: true }],
  "contact-classic": [{ id: "name", label: "Seu nome", type: "text", required: true }, { id: "email", label: "E-mail", type: "email", required: true }, { id: "message", label: "Mensagem", type: "textarea", required: true }],
  "contact-panel": [{ id: "email", label: "E-mail", type: "email", required: true }, { id: "message", label: "Mensagem", type: "textarea", required: true }],
  "waitlist-classic": [{ id: "email", label: "E-mail", type: "email", required: true }],
  "demo-request": [{ id: "firstName", label: "Nome", type: "text", required: true }, { id: "lastName", label: "Sobrenome", type: "text", required: true }, { id: "email", label: "E-mail profissional", type: "email", required: true }, { id: "role", label: "Cargo", type: "text", required: false }, { id: "project", label: "O que você quer desenvolver?", type: "textarea", required: false }],
}

export function FormFields({ fields }: { fields: FormField[] }) {
  const prefix = useId()
  return <FieldGroup>{fields.map((field) => <Field key={field.id}>
    <FieldLabel htmlFor={`${prefix}-${field.id}`}>{field.label}</FieldLabel>
    {field.type === "textarea" ? <Textarea id={`${prefix}-${field.id}`} name={field.id} required={field.required} maxLength={4000} rows={4} /> : field.type === "select" ?
      <Select name={field.id} required={field.required}><SelectTrigger id={`${prefix}-${field.id}`} className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{field.options?.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select> :
      <Input id={`${prefix}-${field.id}`} name={field.id} type={field.type} required={field.required} maxLength={field.type === "email" ? 254 : 4000} step={field.type === "number" ? "any" : undefined} />}
  </Field>)}</FieldGroup>
}
