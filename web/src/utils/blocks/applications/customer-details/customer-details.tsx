import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

type CustomerStatus = "active" | "vip" | "at-risk"

type CustomerRecord = {
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  status: CustomerStatus
  notes: string
}

const defaultCustomer: CustomerRecord = {
  firstName: "Pessoa",
  lastName: "Exemplo",
  email: "pessoa@exemplo.com",
  phone: "+55 (11) 99999-9999",
  company: "Empresa Exemplo",
  status: "active",
  notes: "Prefere contato por e-mail. Atendimento em horário comercial.",
}

function isCustomerStatus(value: string): value is CustomerStatus {
  return value === "active" || value === "vip" || value === "at-risk"
}

function readCustomer(item?: ContentItem): CustomerRecord {
  if (!item) return defaultCustomer
  const nameParts = item.title.trim().split(/\s+/)

  return {
    firstName: item.features[0] || nameParts[0] || defaultCustomer.firstName,
    lastName:
      item.features[1] ||
      nameParts.slice(1).join(" ") ||
      defaultCustomer.lastName,
    email: item.href || defaultCustomer.email,
    phone: item.features[2] || defaultCustomer.phone,
    company: item.features[3] || defaultCustomer.company,
    status: isCustomerStatus(item.value) ? item.value : defaultCustomer.status,
    notes: item.description,
  }
}

function writeCustomer(
  customer: CustomerRecord,
  current?: ContentItem
): ContentItem {
  return {
    id: current?.id ?? "customer-1742",
    title: `${customer.firstName} ${customer.lastName}`.trim(),
    description: customer.notes,
    href: customer.email,
    value: customer.status,
    features: [
      customer.firstName,
      customer.lastName,
      customer.phone,
      customer.company,
    ],
  }
}

export function CustomerDetailsBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const formId = useId()
  const sourceItems = useRef(p.items)
  const [customer, setCustomer] = useState(() => readCustomer(p.items?.[0]))
  const [savedCustomer, setSavedCustomer] = useState(() =>
    readCustomer(p.items?.[0])
  )
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (sourceItems.current === p.items) return
    sourceItems.current = p.items
    const nextCustomer = readCustomer(p.items?.[0])
    setCustomer(nextCustomer)
    setSavedCustomer(nextCustomer)
  }, [p.items])

  const update =
    (key: keyof CustomerRecord) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSaved(false)
      setCustomer((current) => ({ ...current, [key]: event.target.value }))
    }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const currentItems = p.items ?? []
    const nextItems = currentItems.length
      ? [writeCustomer(customer, currentItems[0]), ...currentItems.slice(1)]
      : [writeCustomer(customer)]
    sourceItems.current = p.items
    setSavedCustomer(customer)
    setSaved(true)
    editor?.replaceItems?.(nextItems)
  }

  const controlProps = {
    className: "pointer-events-auto",
    "data-inline-editor-control": "",
  }

  return (
    <section className="builder-block bg-background">
      <form
        id={formId}
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 rounded-2xl border bg-card p-5 shadow-sm @md:p-8"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-4 @md:flex-row @md:items-end @md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "eyebrow" }}
                value={p.eyebrow}
                label="identificador do cliente"
              />
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="título do formulário"
              />
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="pointer-events-auto"
              data-inline-editor-control=""
              onClick={() => {
                setCustomer(savedCustomer)
                setSaved(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              className="pointer-events-auto"
              data-inline-editor-control=""
            >
              {p.button}
            </Button>
          </div>
        </div>

        <FieldGroup className="grid gap-5 @md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${formId}-first-name`}>Nome</FieldLabel>
            <Input
              {...controlProps}
              id={`${formId}-first-name`}
              value={customer.firstName}
              onChange={update("firstName")}
              autoComplete="given-name"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-last-name`}>Sobrenome</FieldLabel>
            <Input
              {...controlProps}
              id={`${formId}-last-name`}
              value={customer.lastName}
              onChange={update("lastName")}
              autoComplete="family-name"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-email`}>E-mail</FieldLabel>
            <Input
              {...controlProps}
              id={`${formId}-email`}
              type="email"
              value={customer.email}
              onChange={update("email")}
              autoComplete="email"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-phone`}>Telefone</FieldLabel>
            <Input
              {...controlProps}
              id={`${formId}-phone`}
              type="tel"
              value={customer.phone}
              onChange={update("phone")}
              autoComplete="tel"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-company`}>Empresa</FieldLabel>
            <Input
              {...controlProps}
              id={`${formId}-company`}
              value={customer.company}
              onChange={update("company")}
              autoComplete="organization"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-status`}>Status</FieldLabel>
            <Select
              value={customer.status}
              onValueChange={(value) => {
                if (!value || !isCustomerStatus(value)) return
                setSaved(false)
                setCustomer((current) => ({ ...current, status: value }))
              }}
            >
              <SelectTrigger
                {...controlProps}
                id={`${formId}-status`}
                className="pointer-events-auto w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" {...controlProps}>
                  Ativo
                </SelectItem>
                <SelectItem value="vip" {...controlProps}>
                  VIP
                </SelectItem>
                <SelectItem value="at-risk" {...controlProps}>
                  Em risco
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field className="@md:col-span-2">
            <FieldLabel htmlFor={`${formId}-notes`}>Observações</FieldLabel>
            <Textarea
              {...controlProps}
              id={`${formId}-notes`}
              value={customer.notes}
              onChange={update("notes")}
              rows={4}
            />
          </Field>
        </FieldGroup>

        {saved ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            Customer record saved.
          </p>
        ) : null}
      </form>
    </section>
  )
}
