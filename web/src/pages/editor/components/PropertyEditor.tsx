import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select"
import { useId, type Dispatch } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/motion/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { definitions } from "@/utils/blocks"
import { defaultFormFields } from "@/utils/blocks/shared/FormFields"
import { editableItems } from "@/utils/blocks/item-schemas"
import { propertyFields } from "../lib/properties"
import {
  contentItem,
  type BlockProps,
  type ContentItem,
  type FormField,
} from "@/utils/blocks/types"
import { uid, type Block, type Action, type Page } from "../lib/document"

export function PropertyEditor({
  block,
  dispatch,
  pages = [],
}: {
  block: Block
  dispatch: Dispatch<Action>
  pages?: Page[]
}) {
  const prefix = useId()
  const definition = definitions.get(block.definitionId)
  if (!definition) return null
  const categoryLabel = definition.category === "navbar"
    ? "Navegação"
    : definition.category.startsWith("profile-")
      ? "Portfólio"
      : definition.category.replaceAll("-", " ")
  const fields = definition.editableProperties
  const contentFields = propertyFields.filter((field) => fields.includes(field.key))
  const update = (props: Partial<BlockProps>) =>
    dispatch({ type: "update", id: block.id, props })
  const itemSchema = editableItems[definition.category]
  const items = block.props.items ?? []
  const formFields = block.props.formFields ?? defaultFormFields[block.definitionId]
  const hasDisplayControls = fields.includes("showThemeToggle") || fields.includes("alignment") || fields.includes("appearance") || definition.id === "navbar-dock" || definition.category === "navbar" && fields.includes("button")
  const changeField = (id: string, patch: Partial<FormField>) => update({ formFields: formFields.map((field) => field.id === id ? { ...field, ...patch } : field) })
  function updateItem(id: string, patch: Partial<ContentItem>) {
    update({
      items: items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    })
  }
  function moveItem(id: string, offset: number) {
    const from = items.findIndex((item) => item.id === id)
    const reordered = [...items]
    const [item] = reordered.splice(from, 1)
    reordered.splice(from + offset, 0, item)
    update({ items: reordered })
  }
  return (
    <ScrollArea className="min-h-0 w-full flex-1 pr-3">
      <div className="mb-5 flex min-w-0 flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{categoryLabel}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{definition.name}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{definition.description}</p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">{items.length} {items.length === 1 ? "item" : "itens"}</span>
      </div>
      <FieldGroup>
        {definition.category.startsWith("navbar") && definition.id !== "navbar-dock" && (
          <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Comportamento da navegação</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Escolha como a barra de navegação acompanha a página durante a rolagem.</p>
          </div>
          <Field>
            <FieldLabel id={`${prefix}-scroll-behavior`}>Comportamento ao rolar</FieldLabel>
            <ToggleGroup
              aria-labelledby={`${prefix}-scroll-behavior`}
              value={[block.props.scrollBehavior ?? "normal"]}
              onValueChange={(values) => {
                if (values[0] === "normal" || values[0] === "sticky")
                  update({ scrollBehavior: values[0] })
              }}
            >
              <ToggleGroupItem value="normal">Normal</ToggleGroupItem>
              <ToggleGroupItem value="sticky">Acompanhar rolagem</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              Mantém a navbar visível no topo enquanto a página rola.
            </FieldDescription>
          </Field>
          </section>
        )}
        <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground">Layout e movimento</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Defina a largura ocupada, o respiro lateral e a entrada do bloco na página.</p>
        </div>
        <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
        <Field>
          <FieldLabel>Largura do bloco</FieldLabel>
          <Select
            value={block.props.layoutWidth ?? "full"}
            onValueChange={(value) => update({ layoutWidth: value as BlockProps["layoutWidth"] })}
            className="w-full"
          >
            <SelectTrigger aria-label="Largura do bloco" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Tela inteira</SelectItem>
              <SelectItem value="wide">Amplo · 1440 px</SelectItem>
              <SelectItem value="standard">Centralizado · 1120 px</SelectItem>
              <SelectItem value="narrow">Estreito · 760 px</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>O espaçamento lateral também se adapta a telas menores.</FieldDescription>
        </Field>
        {(block.props.layoutWidth ?? "full") === "custom" && (
          <Field>
            <FieldLabel htmlFor={`${prefix}-layout-max-width`}>Largura máxima (px)</FieldLabel>
            <Input
              id={`${prefix}-layout-max-width`}
              type="number"
              min={320}
              max={2400}
              value={block.props.layoutMaxWidth ?? 1120}
              onChange={(event) => update({ layoutMaxWidth: Math.min(2400, Math.max(320, Number(event.target.value) || 320)) })}
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor={`${prefix}-layout-gutter`}>Margem lateral (px)</FieldLabel>
          <Input
            id={`${prefix}-layout-gutter`}
            type="number"
            min={0}
            max={128}
            value={block.props.layoutGutter ?? 0}
            onChange={(event) => update({ layoutGutter: Math.min(128, Math.max(0, Number(event.target.value) || 0)) })}
          />
          <FieldDescription>Espaço livre entre o bloco e as laterais da página.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Animação ao entrar na tela</FieldLabel>
          <Select
            value={block.props.blockAnimation ?? "none"}
            onValueChange={(value) => update({ blockAnimation: value as BlockProps["blockAnimation"] })}
            className="w-full"
          >
            <SelectTrigger aria-label="Animação ao entrar na tela" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem animação</SelectItem>
              <SelectItem value="fade-up">Surgir de baixo</SelectItem>
              <SelectItem value="fade-in">Aparecer</SelectItem>
              <SelectItem value="slide-left">Deslizar da esquerda</SelectItem>
              <SelectItem value="slide-right">Deslizar da direita</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>Movimento reduzido do sistema desativa a animação automaticamente.</FieldDescription>
        </Field>
        </FieldGroup>
        </section>
        <>
            <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground">Fundo e cores</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Personalize o fundo e a cor de destaque deste bloco sem alterar a paleta global do site.</p>
            </div>
            <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
            <Field>
              <FieldLabel>Preenchimento</FieldLabel>
              <Select value={block.props.backgroundMode ?? "theme"} onValueChange={(value) => {
                if (value === "solid") update({ backgroundMode: "solid", backgroundColor: block.props.backgroundColor ?? "#020817" })
                else if (value === "gradient") update({ backgroundMode: "gradient", backgroundGradientFrom: block.props.backgroundGradientFrom ?? "#bbfbff", backgroundGradientVia: block.props.backgroundGradientVia ?? "#4e71ff", backgroundGradientTo: block.props.backgroundGradientTo ?? "#5409da", backgroundGradientAngle: block.props.backgroundGradientAngle ?? 125 })
                else update({ backgroundMode: "theme" })
              }} className="w-full">
                <SelectTrigger aria-label="Preenchimento do fundo" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="theme">Cor do tema</SelectItem><SelectItem value="solid">Cor sólida</SelectItem><SelectItem value="gradient">Degradê personalizado</SelectItem></SelectContent>
              </Select>
            </Field>
            {block.props.backgroundMode === "solid" && (
              <Field>
                <FieldLabel htmlFor={`${prefix}-background-color`}>Cor de fundo</FieldLabel>
                <Input id={`${prefix}-background-color`} type="color" value={block.props.backgroundColor ?? "#020817"} onChange={(event) => update({ backgroundColor: event.target.value })} className="h-10 cursor-pointer p-1" />
              </Field>
            )}
            {block.props.backgroundMode === "gradient" && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                {([
                  ["backgroundGradientFrom", "Cor inicial", "#bbfbff"],
                  ["backgroundGradientVia", "Cor intermediária", "#4e71ff"],
                  ["backgroundGradientTo", "Cor final", "#5409da"],
                ] as const).map(([key, label, fallback]) => (
                  <Field key={key}>
                    <FieldLabel htmlFor={`${prefix}-${key}`}>{label}</FieldLabel>
                    <Input id={`${prefix}-${key}`} type="color" value={block.props[key] ?? fallback} onChange={(event) => update({ [key]: event.target.value })} className="h-10 cursor-pointer p-1" />
                  </Field>
                ))}
                </div>
                <Field>
                  <FieldLabel htmlFor={`${prefix}-background-gradient-angle`}>Ângulo do degradê (graus)</FieldLabel>
                  <Input id={`${prefix}-background-gradient-angle`} type="number" min={0} max={360} value={block.props.backgroundGradientAngle ?? 125} onChange={(event) => update({ backgroundGradientAngle: Math.min(360, Math.max(0, Number(event.target.value) || 0)) })} />
                </Field>
              </>
            )}
            <Field>
              <FieldLabel htmlFor={`${prefix}-accent-color`}>Cor de destaque do bloco</FieldLabel>
              <div className="flex items-center gap-2">
                <Input id={`${prefix}-accent-color`} type="color" value={block.props.accentColor ?? "#2563eb"} onChange={(event) => update({ accentColor: event.target.value })} className="h-10 w-14 cursor-pointer p-1" />
                {block.props.accentColor && <Button type="button" variant="outline" size="sm" onClick={() => update({ accentColor: undefined })}>Usar tema</Button>}
              </div>
              <FieldDescription>Afeta elementos que usam a cor primária, como destaques e foco.</FieldDescription>
            </Field>
            </FieldGroup>
            </section>
            {fields.includes("button") && <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-foreground">Botões deste bloco</h4>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Escolha um tratamento visual e, se desejar, defina cores próprias para as ações deste componente.</p>
              </div>
              <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
                <Field>
                  <FieldLabel>Estilo dos botões</FieldLabel>
                  <Select value={block.props.buttonStyle ?? "theme"} onValueChange={(value) => update({ buttonStyle: value as BlockProps["buttonStyle"] })} className="w-full">
                    <SelectTrigger aria-label="Estilo dos botões" className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theme">Padrão do componente</SelectItem>
                      <SelectItem value="solid">Sólido</SelectItem>
                      <SelectItem value="soft">Suave</SelectItem>
                      <SelectItem value="outline">Contorno</SelectItem>
                      <SelectItem value="ghost">Discreto</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${prefix}-button-color`}>Cor do botão</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input id={`${prefix}-button-color`} type="color" value={block.props.buttonColor ?? "#2563eb"} onChange={(event) => update({ buttonColor: event.target.value })} className="h-10 w-14 cursor-pointer p-1" />
                    {block.props.buttonColor && <Button type="button" variant="outline" size="sm" onClick={() => update({ buttonColor: undefined })}>Usar padrão</Button>}
                  </div>
                  <FieldDescription>Aplica-se aos botões e links de ação do bloco.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${prefix}-button-text-color`}>Cor do texto do botão</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input id={`${prefix}-button-text-color`} type="color" value={block.props.buttonTextColor ?? "#ffffff"} onChange={(event) => update({ buttonTextColor: event.target.value })} className="h-10 w-14 cursor-pointer p-1" />
                    {block.props.buttonTextColor && <Button type="button" variant="outline" size="sm" onClick={() => update({ buttonTextColor: undefined })}>Usar padrão</Button>}
                  </div>
                </Field>
              </FieldGroup>
            </section>}
        </>
        {hasDisplayControls && <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Exibição e interação</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Configure controles de navegação, alinhamento e apresentação disponíveis neste bloco.</p>
          </div>
        {definition.id === "navbar-dock" && (
          <Field>
            <FieldLabel>Rolar suavemente para âncoras</FieldLabel>
            <Select
              value={block.props.smoothScroll === false ? "off" : "on"}
              onValueChange={(value) => update({ smoothScroll: value === "on" })}
              className="w-full"
            >
              <SelectTrigger aria-label="Rolar suavemente para âncoras" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">Ativado</SelectItem>
                <SelectItem value="off">Desativado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        {contentFields.length > 0 && <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Conteúdo e textos</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Edite os textos principais, chamadas e destinos de links deste bloco.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {contentFields.map((field) => (
              <Field key={field.key} className={field.key === "description" ? "sm:col-span-2" : undefined}>
                <FieldLabel htmlFor={`${prefix}-${field.key}`}>
                  {field.label}
                </FieldLabel>
                {field.key === "description" ? (
                  <Textarea
                    id={`${prefix}-${field.key}`}
                    name={field.key}
                    value={block.props[field.key] ?? ""}
                    maxLength={20000}
                    onChange={(event) =>
                      update({ [field.key]: event.target.value })
                    }
                  />
                ) : (
                  <Input
                    id={`${prefix}-${field.key}`}
                    name={field.key}
                    value={block.props[field.key]}
                    maxLength={20000}
                    onChange={(event) =>
                      update({ [field.key]: event.target.value })
                    }
                  />
                )}
              </Field>
            ))}
          </div>
        </section>}
        {definition.id === "editorial-blog-index" && (
          <>
            <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground">Identidade do blog</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Configure a marca, o cabeçalho e a forma como os artigos aparecem.</p>
            </div>
            <Field>
              <FieldLabel htmlFor={`${prefix}-brand-logo-url`}>URL da imagem da logo</FieldLabel>
              <Input id={`${prefix}-brand-logo-url`} type="url" value={block.props.brandLogoUrl ?? ""} placeholder="https://exemplo.com/logo.svg" onChange={(event) => update({ brandLogoUrl: event.target.value })} />
              <FieldDescription>Use uma imagem pública HTTPS ou deixe vazio para usar o nome.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${prefix}-brand-logo-alt`}>Texto alternativo da logo</FieldLabel>
              <Input id={`${prefix}-brand-logo-alt`} value={block.props.brandLogoAlt ?? ""} maxLength={300} onChange={(event) => update({ brandLogoAlt: event.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${prefix}-brand-logo-text`}>Nome ao lado da logo</FieldLabel>
              <Input id={`${prefix}-brand-logo-text`} value={block.props.brandLogoText ?? ""} maxLength={120} onChange={(event) => update({ brandLogoText: event.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${prefix}-brand-logo-href`}>Link da logo</FieldLabel>
              <Input id={`${prefix}-brand-logo-href`} value={block.props.brandLogoHref ?? ""} placeholder="/" onChange={(event) => update({ brandLogoHref: event.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Formato dos artigos</FieldLabel>
              <Select value={block.props.articleLayout ?? "list"} onValueChange={(value) => update({ articleLayout: value as BlockProps["articleLayout"] })} className="w-full">
                <SelectTrigger aria-label="Formato dos artigos" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="list">Lista editorial</SelectItem><SelectItem value="grid">Grade de cartões</SelectItem></SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Checkbox checked={block.props.showArticleImages ?? true} onCheckedChange={(checked) => update({ showArticleImages: checked })} label="Exibir capas" className="text-sm" />
              <Checkbox checked={block.props.showArticleDates ?? true} onCheckedChange={(checked) => update({ showArticleDates: checked })} label="Exibir datas" className="text-sm" />
              <Checkbox checked={block.props.showArticleCategories ?? true} onCheckedChange={(checked) => update({ showArticleCategories: checked })} label="Exibir categorias" className="text-sm" />
              <Checkbox checked={block.props.showArticleSummaries ?? true} onCheckedChange={(checked) => update({ showArticleSummaries: checked })} label="Exibir resumos" className="text-sm" />
            </div>
            </section>
          </>
        )}
        {definition.id === "profile-hero" && (
          <>
            <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground">Imagem e assinatura</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Troque o retrato de capa e a marca sobreposta. URLs vazias mantêm os arquivos padrão do template.</p>
            </div>
            {fields.includes("imageUrl") && <Field>
              <FieldLabel htmlFor={`${prefix}-image`}>URL da imagem</FieldLabel>
              <Input id={`${prefix}-image`} type="url" name="imageUrl" value={block.props.imageUrl ?? ""} onChange={(event) => update({ imageUrl: event.target.value })} placeholder="https://exemplo.com/imagem.jpg" />
              <FieldDescription>Use uma imagem pública HTTPS ou mantenha vazio para usar a imagem do template.</FieldDescription>
            </Field>}
            <Field>
              <FieldLabel htmlFor={`${prefix}-background-logo-url`}>URL da logo</FieldLabel>
              <Input id={`${prefix}-background-logo-url`} type="url" value={block.props.backgroundLogoUrl ?? ""} placeholder="https://exemplo.com/logo.svg" onChange={(event) => update({ backgroundLogoUrl: event.target.value })} />
              <FieldDescription>Aceita imagens públicas HTTPS ou caminhos relativos à raiz.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${prefix}-background-logo-alt`}>Texto alternativo</FieldLabel>
              <Input id={`${prefix}-background-logo-alt`} value={block.props.backgroundLogoAlt ?? ""} maxLength={300} onChange={(event) => update({ backgroundLogoAlt: event.target.value })} />
            </Field>
            {block.props.backgroundMode !== "solid" ? <Checkbox checked={block.props.animateBackground ?? true} onCheckedChange={(checked) => update({ animateBackground: checked })} label="Animar o fundo com shader" className="text-sm" /> : null}
            </section>
          </>
        )}
        {definition.id === "profile-projects" && (
          <>
            <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground">Conexão com uma API</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Mapeie uma resposta JSON pública para preencher a lista. Os itens editados abaixo continuam disponíveis se a conexão falhar.</p>
            </div>
            <Field>
              <FieldLabel htmlFor={`${prefix}-items-api-url`}>URL da API</FieldLabel>
              <Input id={`${prefix}-items-api-url`} type="url" value={block.props.itemsApiUrl ?? ""} placeholder="https://api.exemplo.com/projetos" onChange={(event) => update({ itemsApiUrl: event.target.value })} />
              <FieldDescription>Não inclua tokens ou chaves secretas neste campo.</FieldDescription>
            </Field>
            {([
              ["itemsApiPath", "Caminho até a lista", "Ex.: data.items; vazio quando o JSON já é uma lista"],
              ["itemsApiTitleKey", "Campo do nome", "Ex.: name"],
              ["itemsApiDescriptionKey", "Campo da descrição", "Ex.: description"],
              ["itemsApiHrefKey", "Campo do link", "Ex.: html_url"],
              ["itemsApiValueKey", "Campo da linguagem ou categoria", "Ex.: language"],
              ["itemsApiFeaturesKey", "Campo dos tópicos", "Ex.: topics"],
            ] as const).map(([key, label, placeholder]) => (
              <Field key={key}>
                <FieldLabel htmlFor={`${prefix}-${key}`}>{label}</FieldLabel>
                <Input id={`${prefix}-${key}`} value={block.props[key] ?? ""} placeholder={placeholder} maxLength={160} onChange={(event) => update({ [key]: event.target.value })} />
              </Field>
            ))}
            </section>
          </>
        )}
        {fields.includes("imageUrl") && definition.id !== "profile-hero" && (
          <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground">Imagem do bloco</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Defina a imagem utilizada e o texto alternativo para acessibilidade.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${prefix}-image`}>URL da imagem</FieldLabel>
              <Input
                id={`${prefix}-image`}
                type="url"
                name="imageUrl"
                value={block.props.imageUrl ?? ""}
                onChange={(event) => update({ imageUrl: event.target.value })}
              />
              <FieldDescription>Use HTTPS ou um caminho relativo à raiz.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${prefix}-alt`}>Texto alternativo da imagem</FieldLabel>
              <Input
                id={`${prefix}-alt`}
                name="imageAlt"
                value={block.props.imageAlt ?? ""}
                onChange={(event) => update({ imageAlt: event.target.value })}
              />
            </Field>
            </div>
          </section>
        )}
        {fields.includes("showThemeToggle") && (
          <Field>
            <FieldLabel id={`${prefix}-theme-toggle`}>Seletor de tema</FieldLabel>
            <ToggleGroup
              aria-labelledby={`${prefix}-theme-toggle`}
              value={[block.props.showThemeToggle ? "visible" : "hidden"]}
              onValueChange={(values) => {
                if (values[0] === "visible" || values[0] === "hidden")
                  update({ showThemeToggle: values[0] === "visible" })
              }}
            >
              <ToggleGroupItem value="hidden">Ocultar</ToggleGroupItem>
              <ToggleGroupItem value="visible">Exibir</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        )}
        {definition.category === "navbar" && fields.includes("button") && (
          <Field>
            <FieldLabel>Abrir botão em</FieldLabel>
            <Select value={block.props.buttonTarget ?? "_self"} onValueChange={(value) => update({ buttonTarget: value as BlockProps["buttonTarget"] })} className="w-full">
              <SelectTrigger aria-label="Abrir botão em" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="_self">Mesma aba</SelectItem><SelectItem value="_blank">Nova aba</SelectItem></SelectContent>
            </Select>
          </Field>
        )}
        {fields.includes("alignment") && (
          <Field>
            <FieldLabel id={`${prefix}-alignment`}>Alinhamento</FieldLabel>
            <ToggleGroup
              aria-labelledby={`${prefix}-alignment`}
              value={[
                block.props.alignment ??
                  (definition.variant === "split" ? "left" : "center"),
              ]}
              onValueChange={(values) => {
                if (values[0] === "left" || values[0] === "center")
                  update({ alignment: values[0] })
              }}
            >
              <ToggleGroupItem value="left">Esquerda</ToggleGroupItem>
              <ToggleGroupItem value="center">Centro</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        )}
        {fields.includes("appearance") && (
          <Field>
            <FieldLabel id={`${prefix}-appearance`}>Aparência</FieldLabel>
            <ToggleGroup
              aria-labelledby={`${prefix}-appearance`}
              value={[block.props.appearance ?? "default"]}
              onValueChange={(values) => {
                if (values[0] === "default" || values[0] === "tinted")
                  update({ appearance: values[0] })
              }}
            >
              <ToggleGroupItem value="default">Padrão</ToggleGroupItem>
              <ToggleGroupItem value="tinted">Com cor</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        )}
        </section>}
        {formFields && <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Campos do formulário</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Defina até 20 campos. Os identificadores permanecem estáveis para preservar as respostas.</p>
          </div>
          <Accordion>
            {formFields.map((field, index) => <AccordionItem value={field.id} key={field.id}>
              <AccordionTrigger>{index + 1}. {field.label}</AccordionTrigger>
              <AccordionContent><FieldGroup>
                <Field><FieldLabel htmlFor={`${prefix}-${field.id}-label`}>Rótulo</FieldLabel><Input id={`${prefix}-${field.id}-label`} value={field.label} maxLength={100} onChange={(event) => changeField(field.id, { label: event.target.value })} /></Field>
                <Field><FieldLabel>Tipo</FieldLabel><Select value={field.type} onValueChange={(value) => { const type = value as FormField["type"]; changeField(field.id, { type, options: type === "select" ? field.options?.length ? field.options : [{ id: "option_1", label: "Opção 1" }] : undefined }) }} className="w-full"><SelectTrigger aria-label={`Tipo do campo ${field.label}`} className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Texto curto</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="textarea">Texto longo</SelectItem><SelectItem value="number">Número</SelectItem><SelectItem value="select">Seleção</SelectItem></SelectContent></Select></Field>
                <Checkbox checked={field.required} onCheckedChange={(required) => changeField(field.id, { required })} label="Obrigatório" className="text-sm" />
                {field.type === "select" && <Field><FieldLabel>Opções</FieldLabel>{field.options?.map((option) => <div key={option.id} className="flex gap-2"><Input aria-label={`Rótulo da opção ${option.id}`} value={option.label} maxLength={100} onChange={(event) => changeField(field.id, { options: field.options?.map((item) => item.id === option.id ? { ...item, label: event.target.value } : item) })} /><Button type="button" variant="outline" size="sm" disabled={(field.options?.length ?? 0) <= 1} onClick={() => changeField(field.id, { options: field.options?.filter((item) => item.id !== option.id) })}>Remover</Button></div>)}<Button type="button" variant="outline" size="sm" disabled={(field.options?.length ?? 0) >= 30} onClick={() => changeField(field.id, { options: [...(field.options ?? []), { id: `option_${uid().replaceAll("-", "")}`, label: "Nova opção" }] })}>Adicionar opção</Button></Field>}
                <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => { const next = [...formFields]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update({ formFields: next }) }}>Subir</Button><Button type="button" variant="outline" size="sm" disabled={index === formFields.length - 1} onClick={() => { const next = [...formFields]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; update({ formFields: next }) }}>Descer</Button><Button type="button" variant="outline" size="sm" disabled={formFields.length <= 1} onClick={() => update({ formFields: formFields.filter((item) => item.id !== field.id) })}>Remover campo</Button></div>
              </FieldGroup></AccordionContent>
            </AccordionItem>)}
          </Accordion>
          <Button type="button" variant="outline" disabled={formFields.length >= 20} onClick={() => update({ formFields: [...formFields, { id: `field_${uid().replaceAll("-", "")}`, label: "Novo campo", type: "text", required: false }] })}>Adicionar campo</Button>
        </section>}
        {fields.includes("items") && itemSchema && (
          <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="mb-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Itens e conteúdo repetível</h4>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Edite cada item abrindo sua linha. Reordene-os com os controles abaixo; limite de 50 itens.</p>
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">{items.length}/50</span>
              </div>
            </div>
            <Accordion>
              {items.map((item, index) => (
                <AccordionItem value={item.id} key={item.id}>
                  <AccordionTrigger>
                    {index + 1}. {item.title || "Item sem título"}
                  </AccordionTrigger>
                  <AccordionContent>
                    <FieldGroup>
                      {(["title", "description", "href", "value"] as const)
                        .filter((key) => itemSchema[key])
                        .map((key) => (
                          <Field key={key}>
                            <FieldLabel htmlFor={`${prefix}-${item.id}-${key}`}>
                              {itemSchema[key]}
                            </FieldLabel>
                            {key === "description" ? (
                              <Textarea
                                id={`${prefix}-${item.id}-${key}`}
                                value={item[key]}
                                onChange={(event) =>
                                  updateItem(item.id, {
                                    [key]: event.target.value,
                                  })
                                }
                              />
                            ) : definition.category.startsWith("navbar") && key === "href" ? (
                              <div className="flex flex-col gap-2">
                                <Input
                                  id={`${prefix}-${item.id}-${key}`}
                                  value={item.href.startsWith("page:") ? "" : item.href}
                                  placeholder="https://exemplo.com ou #secao"
                                  onChange={(event) => updateItem(item.id, { href: event.target.value })}
                                />
                                <Select
                                  value={item.href.startsWith("page:") ? item.href : "custom-url"}
                                  onValueChange={(value) => updateItem(item.id, { href: value === "custom-url" ? "" : value })}
                                  className="w-full"
                                >
                                  <SelectTrigger aria-label={`Página do projeto para ${item.title}`} className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="custom-url">Usar URL personalizada</SelectItem>
                                    {pages.map((page) => <SelectItem key={page.id} value={`page:${page.id}`}>{page.parentPageId ? `↳ ${page.name}` : page.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <Input
                                id={`${prefix}-${item.id}-${key}`}
                                value={item[key]}
                                onChange={(event) =>
                                  updateItem(item.id, {
                                    [key]: event.target.value,
                                  })
                                }
                              />
                            )}
                          </Field>
                        ))}
                      {definition.category.startsWith("navbar") && (
                        <Field>
                          <FieldLabel>Abrir link em</FieldLabel>
                          <Select value={item.target ?? "_self"} onValueChange={(value) => updateItem(item.id, { target: value as ContentItem["target"] })} className="w-full">
                            <SelectTrigger aria-label={`Abrir link para ${item.title} em`} className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="_self">Mesma aba</SelectItem><SelectItem value="_blank">Nova aba</SelectItem></SelectContent>
                          </Select>
                        </Field>
                      )}
                      {itemSchema.featureLabels?.map((label, featureIndex, labels) => (
                        <Field key={featureIndex}>
                          <FieldLabel>
                            {label}
                          </FieldLabel>
                          {definition.category.startsWith("navbar") && featureIndex === 0 ? (
                            <Select
                              value={item.features[featureIndex] || "root-item"}
                              onValueChange={(value) => updateItem(item.id, { features: [value === "root-item" ? "" : value, ...item.features.slice(1)] })}
                              className="w-full"
                            >
                              <SelectTrigger aria-label={`Item pai para ${item.title}`} className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="root-item">Item principal</SelectItem>
                                {items.filter((candidate) => candidate.id !== item.id && !candidate.features[0]).map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.title}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : itemSchema.multilineFeatures?.includes(featureIndex) ? (
                            <Textarea
                              id={`${prefix}-${item.id}-feature-${featureIndex}`}
                              value={item.features[featureIndex] ?? ""}
                              maxLength={2000}
                              rows={12}
                              className="font-mono text-xs"
                              onChange={(event) =>
                                updateItem(item.id, {
                                  features: labels.map((_, index) =>
                                    index === featureIndex
                                      ? event.target.value
                                      : item.features[index] ?? ""
                                  ),
                                })
                              }
                            />
                          ) : (
                            <Input
                              id={`${prefix}-${item.id}-feature-${featureIndex}`}
                              value={item.features[featureIndex] ?? ""}
                              maxLength={2000}
                              onChange={(event) =>
                                updateItem(item.id, {
                                  features: labels.map((_, index) =>
                                    index === featureIndex
                                      ? event.target.value
                                      : item.features[index] ?? ""
                                  ),
                                })
                              }
                            />
                          )}
                        </Field>
                      ))}
                      {itemSchema.features && !itemSchema.featureLabels && (
                        <Field>
                          <FieldLabel htmlFor={`${prefix}-${item.id}-features`}>
                            {itemSchema.features}
                          </FieldLabel>
                          <Textarea
                            id={`${prefix}-${item.id}-features`}
                            value={item.features.join("\n")}
                            onChange={(event) =>
                              updateItem(item.id, {
                                features: event.target.value
                                  .split("\n")
                                  .slice(0, 30),
                              })
                            }
                          />
                        </Field>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => moveItem(item.id, -1)}
                          aria-label={`Mover item ${index + 1} para cima`}
                        >
                          Subir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(item.id, 1)}
                          aria-label={`Mover item ${index + 1} para baixo`}
                        >
                          Descer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            update({
                              items: items.filter(
                                (entry) => entry.id !== item.id
                              ),
                            })
                          }
                          aria-label={`Remover item ${index + 1}`}
                        >
                          Remover
                        </Button>
                      </div>
                    </FieldGroup>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Button
              variant="outline"
              disabled={items.length >= 50}
              onClick={() =>
                update({ items: [...items, contentItem(uid(), "New item")] })
              }
            >
              Adicionar item
            </Button>
          </section>
        )}
      </FieldGroup>
    </ScrollArea>
  )
}
