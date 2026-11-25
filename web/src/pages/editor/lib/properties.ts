import type { BlockProps } from "@/utils/blocks"
export const propertyFields: {
  key: keyof Pick<
    BlockProps,
    "title" | "highlight" | "description" | "button" | "href" | "eyebrow" | "logoHref"
  >
  label: string
}[] = [
  { key: "eyebrow", label: "Texto acima do título" },
  { key: "title", label: "Título" },
  { key: "highlight", label: "Destaque do título" },
  { key: "description", label: "Descrição" },
  { key: "button", label: "Texto do botão" },
  { key: "href", label: "URL do botão" },
  { key: "logoHref", label: "Caminho ao clicar no logo" },
]
