/** Additive version-1 properties. Missing optional fields retain the original layout. */
export interface ContentItem {
  id: string
  title: string
  highlight?: string
  description: string
  href: string
  value: string
  features: string[]
  target?: "_self" | "_blank"
}
export interface FormFieldOption { id: string; label: string }
export interface FormField {
  id: string
  label: string
  type: "text" | "email" | "textarea" | "number" | "select"
  required: boolean
  options?: FormFieldOption[]
}
export interface BlockProps {
  /** Propriedades futuras ou específicas de extensões permanecem opacas. */
  [key: string]: unknown
  title: string
  highlight?: string
  description: string
  button: string
  href: string
  eyebrow: string
  imageUrl?: string
  imageAlt?: string
  logoHref?: string
  backgroundLogoUrl?: string
  backgroundLogoAlt?: string
  brandLogoUrl?: string
  brandLogoAlt?: string
  brandLogoText?: string
  brandLogoHref?: string
  articleLayout?: "list" | "grid"
  showArticleImages?: boolean
  showArticleDates?: boolean
  showArticleCategories?: boolean
  showArticleSummaries?: boolean
  itemsApiUrl?: string
  itemsApiPath?: string
  itemsApiTitleKey?: string
  itemsApiDescriptionKey?: string
  itemsApiHrefKey?: string
  itemsApiValueKey?: string
  itemsApiFeaturesKey?: string
  showThemeToggle?: boolean
  buttonTarget?: "_self" | "_blank"
  alignment?: "left" | "center"
  appearance?: "default" | "tinted"
  scrollBehavior?: "normal" | "sticky"
  smoothScroll?: boolean
  layoutWidth?: "full" | "wide" | "standard" | "narrow" | "custom"
  layoutMaxWidth?: number
  layoutGutter?: number
  blockAnimation?: "none" | "fade-up" | "fade-in" | "slide-left" | "slide-right"
  animateBackground?: boolean
  backgroundMode?: "theme" | "solid" | "gradient"
  backgroundColor?: string
  backgroundGradientFrom?: string
  backgroundGradientVia?: string
  backgroundGradientTo?: string
  backgroundGradientAngle?: number
  buttonStyle?: "theme" | "solid" | "soft" | "outline" | "ghost"
  buttonColor?: string
  buttonTextColor?: string
  accentColor?: string
  items?: ContentItem[]
  formFields?: FormField[]
}
export const textPropertyKeys = [
  "title",
  "highlight",
  "description",
  "button",
  "href",
  "eyebrow",
  "imageUrl",
  "imageAlt",
  "logoHref",
  "backgroundLogoUrl",
  "backgroundLogoAlt",
  "brandLogoUrl",
  "brandLogoAlt",
  "brandLogoText",
  "brandLogoHref",
  "itemsApiUrl",
  "itemsApiPath",
  "itemsApiTitleKey",
  "itemsApiDescriptionKey",
  "itemsApiHrefKey",
  "itemsApiValueKey",
  "itemsApiFeaturesKey",
  "backgroundColor",
  "backgroundGradientFrom",
  "backgroundGradientVia",
  "backgroundGradientTo",
  "buttonColor",
  "buttonTextColor",
  "accentColor",
] as const
const booleanPropertyKeys = [
  "animateBackground",
  "showArticleImages",
  "showArticleDates",
  "showArticleCategories",
  "showArticleSummaries",
] as const
const validatedPropertyKeys = new Set<string>([
  ...textPropertyKeys,
  ...booleanPropertyKeys,
  "articleLayout",
  "alignment",
  "appearance",
  "scrollBehavior",
  "smoothScroll",
  "layoutWidth",
  "layoutMaxWidth",
  "layoutGutter",
  "blockAnimation",
  "backgroundMode",
  "buttonStyle",
  "backgroundGradientAngle",
  "items",
  "logoHref",
  "showThemeToggle",
  "buttonTarget",
  "formFields",
])
export function parseBlockProps(
  value: Record<string, unknown>,
  defaults: BlockProps
): BlockProps | null {
  const props: BlockProps = { ...structuredClone(defaults) }
  for (const [key, extensionValue] of Object.entries(value)) {
    if (!validatedPropertyKeys.has(key)) props[key] = extensionValue
  }
  for (const key of textPropertyKeys) {
    const text = value[key]
    if (text !== undefined) {
      if (typeof text !== "string" || text.length > 20000) return null
      props[key] = text
    }
  }
  for (const key of booleanPropertyKeys) {
    const boolean = value[key]
    if (boolean !== undefined) {
      if (typeof boolean !== "boolean") return null
      props[key] = boolean
    }
  }
  if (value.articleLayout !== undefined) {
    if (value.articleLayout !== "list" && value.articleLayout !== "grid") return null
    props.articleLayout = value.articleLayout
  }
  if (value.alignment !== undefined) {
    if (value.alignment !== "left" && value.alignment !== "center") return null
    props.alignment = value.alignment
  }
  if (value.appearance !== undefined) {
    if (value.appearance !== "default" && value.appearance !== "tinted")
      return null
    props.appearance = value.appearance
  }
  if (value.scrollBehavior !== undefined) {
    if (value.scrollBehavior !== "normal" && value.scrollBehavior !== "sticky")
      return null
    props.scrollBehavior = value.scrollBehavior
  }
  if (value.smoothScroll !== undefined) {
    if (typeof value.smoothScroll !== "boolean") return null
    props.smoothScroll = value.smoothScroll
  }
  if (value.layoutWidth !== undefined) {
    if (!["full", "wide", "standard", "narrow", "custom"].includes(String(value.layoutWidth))) return null
    props.layoutWidth = value.layoutWidth as BlockProps["layoutWidth"]
  }
  if (value.layoutMaxWidth !== undefined) {
    if (typeof value.layoutMaxWidth !== "number" || !Number.isFinite(value.layoutMaxWidth) || value.layoutMaxWidth < 320 || value.layoutMaxWidth > 2400) return null
    props.layoutMaxWidth = value.layoutMaxWidth
  }
  if (value.layoutGutter !== undefined) {
    if (typeof value.layoutGutter !== "number" || !Number.isFinite(value.layoutGutter) || value.layoutGutter < 0 || value.layoutGutter > 128) return null
    props.layoutGutter = value.layoutGutter
  }
  if (value.blockAnimation !== undefined) {
    if (!["none", "fade-up", "fade-in", "slide-left", "slide-right"].includes(String(value.blockAnimation))) return null
    props.blockAnimation = value.blockAnimation as BlockProps["blockAnimation"]
  }
  if (value.backgroundMode !== undefined) {
    if (!(["theme", "solid", "gradient"] as const).includes(value.backgroundMode as "theme" | "solid" | "gradient")) return null
    props.backgroundMode = value.backgroundMode as BlockProps["backgroundMode"]
  }
  if (value.buttonStyle !== undefined) {
    if (!(value.buttonStyle === "theme" || value.buttonStyle === "solid" || value.buttonStyle === "soft" || value.buttonStyle === "outline" || value.buttonStyle === "ghost")) return null
    props.buttonStyle = value.buttonStyle
  }
  for (const key of ["backgroundColor", "backgroundGradientFrom", "backgroundGradientVia", "backgroundGradientTo", "buttonColor", "buttonTextColor", "accentColor"] as const) {
    const color = value[key]
    if (color !== undefined && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) return null
    if (color !== undefined) props[key] = color
  }
  if (value.backgroundGradientAngle !== undefined) {
    if (typeof value.backgroundGradientAngle !== "number" || !Number.isFinite(value.backgroundGradientAngle) || value.backgroundGradientAngle < 0 || value.backgroundGradientAngle > 360) return null
    props.backgroundGradientAngle = value.backgroundGradientAngle
  }
  if (value.items !== undefined) {
    if (!Array.isArray(value.items) || value.items.length > 50) return null
    const ids = new Set<string>()
    const items: ContentItem[] = []
    for (const item of value.items) {
      if (typeof item !== "object" || item === null || Array.isArray(item))
        return null
      if (typeof item.id !== "string" || !item.id || ids.has(item.id))
        return null
      ids.add(item.id)
      for (const key of ["title", "description", "href", "value"])
        if (typeof item[key] !== "string" || item[key].length > 20000)
          return null
      if (
        !Array.isArray(item.features) ||
        item.features.length > 30 ||
        item.features.some(
          (feature: unknown) =>
            typeof feature !== "string" || feature.length > 2000
        )
      )
        return null
      if (item.target !== undefined && item.target !== "_self" && item.target !== "_blank") return null
      items.push({
        id: item.id,
        title: item.title,
        description: item.description,
        href: item.href,
        value: item.value,
        features: [...item.features],
        ...(item.target ? { target: item.target } : {}),
      })
    }
    props.items = items
  }
  if (value.logoHref !== undefined) {
    if (typeof value.logoHref !== "string" || value.logoHref.length > 20000) return null
    props.logoHref = value.logoHref
  }
  if (value.showThemeToggle !== undefined) {
    if (typeof value.showThemeToggle !== "boolean") return null
    props.showThemeToggle = value.showThemeToggle
  }
  if (value.buttonTarget !== undefined) {
    if (value.buttonTarget !== "_self" && value.buttonTarget !== "_blank") return null
    props.buttonTarget = value.buttonTarget
  }
  if (value.formFields !== undefined) {
    if (!Array.isArray(value.formFields) || value.formFields.length < 1 || value.formFields.length > 20) return null
    const ids = new Set<string>()
    const parsed: FormField[] = []
    for (const field of value.formFields) {
      if (!field || typeof field !== "object" || Array.isArray(field)) return null
      if (typeof field.id !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(field.id) || ids.has(field.id)) return null
      if (typeof field.label !== "string" || !field.label.trim() || field.label.length > 100) return null
      if (!["text", "email", "textarea", "number", "select"].includes(field.type) || typeof field.required !== "boolean") return null
      ids.add(field.id)
      const options: FormFieldOption[] = []
      if (field.type === "select") {
        if (!Array.isArray(field.options) || field.options.length < 1 || field.options.length > 30) return null
        const optionIds = new Set<string>()
        for (const option of field.options) {
          if (!option || typeof option.id !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(option.id) || optionIds.has(option.id) || typeof option.label !== "string" || !option.label.trim() || option.label.length > 100) return null
          optionIds.add(option.id)
          options.push({ id: option.id, label: option.label })
        }
      } else if (field.options !== undefined && (!Array.isArray(field.options) || field.options.length !== 0)) return null
      parsed.push({ id: field.id, label: field.label, type: field.type, required: field.required, ...(field.type === "select" ? { options } : {}) })
    }
    props.formFields = parsed
  }
  return props
}
export function contentItem(
  id: string,
  title: string,
  description = "",
  href = "#",
  value = "",
  features: string[] = []
): ContentItem {
  return { id, title, description, href, value, features }
}
