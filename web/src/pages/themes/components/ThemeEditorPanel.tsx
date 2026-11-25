import { useState } from "react"
import InfiniteScroll from "react-infinite-scroll-component"
import {
  MoreHorizontal,
  Palette,
  Pencil,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  BouncyAccordion,
  type BouncyAccordionItem,
} from "@/components/motion/bouncy-accordion"
import { Input } from "@/components/motion/input"
import { Slider } from "@/components/ui/slider"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs"
import {
  colorKeys,
  themePresets,
  type ColorKey,
  type ProjectTheme,
} from "@/pages/editor/lib/project-theme"
import { themeColorLabels, themeFonts } from "../lib/theme-lab"
import { ThemePaletteThumb } from "./ThemePaletteThumb"
import {
  ColorPicker,
  ColorPickerContent,
  ColorPickerSwatch,
  ColorPickerTrigger,
} from "@/components/reui/color-picker"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnimatedBadge } from "@/components/motion/animated-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select"
import type { SavedTheme } from "@/services/projects/theme.service"

function ThemeColorPicker({
  id,
  label,
  value,
  onCommit,
}: {
  id: string
  label: string
  value: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)

  return (
    <ColorPicker
      id={id}
      aria-label={label}
      value={draft}
      onValueChange={(next) => {
        if (next) setDraft(next)
      }}
      onValueCommit={(next) => {
        if (next) {
          setDraft(next)
          onCommit(next)
        }
      }}
    >
      <ColorPickerTrigger className="size-8 cursor-pointer overflow-hidden rounded-md p-0">
        <ColorPickerSwatch className="size-full rounded-[inherit] after:rounded-[inherit]" />
      </ColorPickerTrigger>
      <ColorPickerContent />
    </ColorPicker>
  )
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block space-y-2 text-xs">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">
          {value}
          {suffix}
        </span>
      </span>
      <Slider aria-label={label} min={min} max={max} step={step} value={[value]} onValueChange={(values) => onChange(Array.isArray(values) ? values[0] ?? min : values)} />
    </label>
  )
}

function ColorTokenField({
  value,
  label,
  onCommit,
}: {
  value: string
  label: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)

  function commit() {
    if (/^#[\da-f]{6}$/i.test(draft)) onCommit(draft)
    else setDraft(value)
  }

  return (
    <Input
      aria-label={`Hexadecimal ${label}`}
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
      }}
      maxLength={7}
      className="font-mono text-xs"
    />
  )
}

interface ThemeEditorPanelProps {
  theme: ProjectTheme
  dirty: boolean
  onUpdate: (changes: Partial<ProjectTheme>) => void
  onColorChange: (key: ColorKey, value: string) => void
  onSelectPreset: (name: string) => void
  savedThemes: SavedTheme[]
  loadingThemes: boolean
  hasMoreThemes: boolean
  loadingMoreThemes: boolean
  onLoadMoreThemes: () => void
  onLoadSavedTheme: (theme: SavedTheme) => void
  saving: boolean
  onRequestDeleteTheme: (theme: SavedTheme) => void
  onRequestRenameTheme: (theme: SavedTheme) => void
  onReset: () => void
}

export function ThemeEditorPanel({
  theme,
  dirty,
  onUpdate,
  onColorChange,
  onSelectPreset,
  savedThemes,
  loadingThemes,
  hasMoreThemes,
  loadingMoreThemes,
  onLoadMoreThemes,
  onLoadSavedTheme,
  saving,
  onRequestDeleteTheme,
  onRequestRenameTheme,
  onReset,
}: ThemeEditorPanelProps) {
  const [tab, setTab] = useState("colors")
  const [resetArmed, setResetArmed] = useState(false)
  const [openPresetSection, setOpenPresetSection] = useState<string | null | undefined>()
  const [openThemePopover, setOpenThemePopover] = useState<string | null>(null)
  const colors = theme[theme.mode]
  const selectedPresetSection =
    openPresetSection === undefined
      ? savedThemes.length > 0
        ? "my-themes"
        : "examples"
      : openPresetSection

  const presetItems: BouncyAccordionItem[] = [
    ...(savedThemes.length > 0
      ? [{
          id: "my-themes",
          title: `Meus temas (${savedThemes.length})`,
          icon: <Palette className="size-4" />,
          description: (
            <InfiniteScroll
              dataLength={savedThemes.length}
              next={onLoadMoreThemes}
              hasMore={hasMoreThemes}
              height={300}
              loader={loadingMoreThemes ? <p className="py-3 text-center text-xs text-muted-foreground">Carregando mais temas…</p> : null}
              endMessage={<p className="py-3 text-center text-xs text-muted-foreground">Todos os temas foram carregados.</p>}
            >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {savedThemes.map((savedTheme) => (
                <article
                  key={savedTheme.id}
                  className="group relative min-w-0 rounded-lg"
                >
                  <button
                    type="button"
                    aria-pressed={theme.presetId === savedTheme.id}
                    onClick={() => {
                      setOpenPresetSection("my-themes")
                      onLoadSavedTheme(savedTheme)
                    }}
                    className="w-full min-w-0 rounded-lg border border-border p-2 text-left text-xs transition-colors hover:bg-muted/50 aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary/40"
                  >
                    <ThemePaletteThumb theme={savedTheme.configuration} />
                    <span className="mt-2 block truncate font-medium text-foreground">
                      {savedTheme.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {savedTheme.configuration.mode === "dark" ? "Escuro" : "Claro"}
                    </span>
                  </button>
                  <Popover
                    open={openThemePopover === savedTheme.id}
                    onOpenChange={(open) => setOpenThemePopover(open ? savedTheme.id : null)}
                  >
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          aria-label={`Ações para ${savedTheme.name}`}
                          title="Ações do tema"
                          className="absolute top-1 right-1 grid size-7 place-items-center rounded-md border border-border bg-card text-foreground opacity-0 shadow-sm transition-opacity hover:bg-muted group-hover:opacity-100 group-focus-within:opacity-100 aria-expanded:opacity-100"
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      side="right"
                      className="w-40 space-y-1 p-2"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setOpenThemePopover(null)
                          onRequestRenameTheme(savedTheme)
                        }}
                      >
                        <Pencil className="size-3.5" />
                        Renomear tema
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setOpenThemePopover(null)
                          onRequestDeleteTheme(savedTheme)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Excluir tema
                      </Button>
                    </PopoverContent>
                  </Popover>
                </article>
              ))}
            </div>
            </InfiniteScroll>
          ),
        }]
      : []),
    {
      id: "examples",
      title: "Exemplos",
      icon: <Palette className="size-4" />,
      description: (
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(themePresets)
            .filter(([name]) => ["Base", "Slate", "Arctic", "Midnight"].includes(name))
            .map(([name, preset]) => {
              const selected = !theme.presetId && theme.preset === name
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectPreset(name)}
                  className="min-w-0 rounded-lg border border-border p-2 text-left text-xs text-foreground transition-colors hover:bg-muted/50 aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary/40"
                >
                  <ThemePaletteThumb
                    theme={{ ...theme, light: preset.light, dark: preset.dark }}
                  />
                  <span className="mt-2 block truncate">{name}</span>
                </button>
              )
            })}
        </div>
      ),
    },
  ]

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border p-5">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Editar tema</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie, teste e salve temas para usar em seus projetos.
        </p>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-5">
        <section aria-label="Presets de partida">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Presets de partida</h3>
            <span className="text-xs text-muted-foreground">
              {theme.presetId ? "Tema pessoal" : `Exemplo: ${theme.preset}`}
            </span>
          </div>
          {loadingThemes && savedThemes.length === 0 ? (
            <p className="mb-2 text-xs text-muted-foreground">
              Carregando seus temas…
            </p>
          ) : null}
          <BouncyAccordion
            items={presetItems}
            value={selectedPresetSection}
            onValueChange={setOpenPresetSection}
            classNames={{
              root: "space-y-1",
              item: "rounded-xl border border-border bg-background",
              trigger: "min-h-12 px-4",
              description: "text-foreground",
            }}
          />
        </section>

        <section className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">Modo de aparência</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Edite cada paleta de forma independente.
              </p>
            </div>
            <div className="flex rounded-lg border border-border p-1">
              {(["light", "dark"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={theme.mode === mode ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={theme.mode === mode}
                  onClick={() => onUpdate({ mode })}
                >
                  {mode === "light" ? (
                    <Sun className="size-3.5" />
                  ) : (
                    <Moon className="size-3.5" />
                  )}
                  {mode === "light" ? "Claro" : "Escuro"}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <Tabs
          value={tab}
          onValueChange={setTab}
          variant="underline"
          className="w-full"
        >
          <TabsList className="w-full justify-between text-xs">
            <TabsTrigger value="colors">Cores</TabsTrigger>
            <TabsTrigger value="type">Tipografia</TabsTrigger>
            <TabsTrigger value="borders">Bordas</TabsTrigger>
            <TabsTrigger value="shadows">Sombras</TabsTrigger>
          </TabsList>
          <TabsContent value="colors" className="space-y-2 pt-4">
            {colorKeys.map((key) => (
              <div
                key={`${key}-${theme.mode}-${colors[key]}`}
                className="grid grid-cols-[minmax(92px,1fr)_34px_minmax(100px,1.2fr)] items-center gap-2 rounded-lg border border-border/70 px-3 py-2"
              >
                <label htmlFor={`theme-${key}`} className="min-w-0">
                  <span className="block truncate text-xs font-medium">
                    {themeColorLabels[key]}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    Token semântico do tema
                  </span>
                </label>
                <ThemeColorPicker
                  id={`theme-${key}`}
                  label={`Selecionar cor ${themeColorLabels[key]}`}
                  value={colors[key]}
                  onCommit={(value) => onColorChange(key, value)}
                />
                <ColorTokenField
                  value={colors[key]}
                  label={themeColorLabels[key]}
                  onCommit={(value) => onColorChange(key, value)}
                />
              </div>
            ))}
          </TabsContent>
          <TabsContent value="type" className="space-y-5 pt-4">
            {(["headingFont", "bodyFont"] as const).map((key) => (
              <label key={key} className="block space-y-2 text-xs">
                <span>
                  {key === "headingFont"
                    ? "Fonte dos títulos"
                    : "Fonte do corpo"}
                </span>
                <Select
                  value={theme[key]}
                  onValueChange={(value) => onUpdate({ [key]: value })}
                  className="w-full"
                >
                  <SelectTrigger
                    aria-label={key === "headingFont" ? "Fonte dos títulos" : "Fonte do corpo"}
                    className="h-10 rounded-lg"
                  >
                    <SelectValue placeholder="Selecione uma fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {themeFonts.map((font) => (
                      <SelectItem
                        key={font.family}
                        value={font.family}
                        className="font-medium"
                      >
                        <span style={{ fontFamily: `"${font.family}", system-ui, sans-serif` }}>
                          {font.label}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {font.style}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ))}
            <RangeControl
              label="Tamanho dos títulos"
              value={theme.headingSize}
              min={75}
              max={150}
              suffix="%"
              onChange={(headingSize) => onUpdate({ headingSize })}
            />
            <RangeControl
              label="Tamanho do texto"
              value={theme.bodySize}
              min={75}
              max={150}
              suffix="%"
              onChange={(bodySize) => onUpdate({ bodySize })}
            />
            <RangeControl
              label="Altura da linha"
              value={theme.lineHeight}
              min={1}
              max={2}
              step={0.05}
              onChange={(lineHeight) => onUpdate({ lineHeight })}
            />
            <RangeControl
              label="Espaçamento entre letras"
              value={theme.letterSpacing}
              min={-2}
              max={4}
              step={0.1}
              suffix="px"
              onChange={(letterSpacing) => onUpdate({ letterSpacing })}
            />
          </TabsContent>
          <TabsContent value="borders" className="space-y-5 pt-4">
            <RangeControl
              label="Arredondamento dos cantos"
              value={theme.radius}
              min={0}
              max={32}
              suffix="px"
              onChange={(radius) => onUpdate({ radius })}
            />
            <div className="grid grid-cols-4 gap-2">
              {[0, 6, 12, 20].map((value) => (
                <Button
                  key={value}
                  variant={theme.radius === value ? "secondary" : "outline"}
                  size="sm"
                  aria-pressed={theme.radius === value}
                  onClick={() => onUpdate({ radius: value })}
                >
                  {value === 0 ? "Reto" : `${value}px`}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              O raio é aplicado a botões, campos e cards na prévia.
            </p>
          </TabsContent>
          <TabsContent value="shadows" className="space-y-5 pt-4">
            <RangeControl
              label="Elevação"
              value={theme.shadow}
              min={0}
              max={32}
              suffix="px"
              onChange={(shadow) => onUpdate({ shadow })}
            />
          </TabsContent>
        </Tabs>
        </div>
      </ScrollArea>
      <footer className="flex flex-wrap items-center gap-2 border-t border-border p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!resetArmed) {
              setResetArmed(true)
              return
            }
            onReset()
            setResetArmed(false)
          }}
        >
          <RotateCcw className="size-3.5" />
          {resetArmed ? "Confirmar restauração" : "Restaurar padrão"}
        </Button>
        <AnimatedBadge
          className="ml-auto"
          status={saving ? "loading" : dirty ? "info" : "success"}
          size="sm"
        >
          {saving ? "Salvando tema…" : dirty ? "Rascunho" : "Tudo salvo"}
        </AnimatedBadge>
      </footer>
    </section>
  )
}
