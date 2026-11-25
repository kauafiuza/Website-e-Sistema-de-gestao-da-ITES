import { Download, Monitor, Smartphone, Tablet } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"

const icons = { desktop: Monitor, ios: Smartphone, android: Tablet }
const badges = {
  ios: { src: "https://cdn.shadcnblocks.com/shadcnblocks/block/badges/appstore.png", alt: "Baixar na loja de aplicativos" },
  android: { src: "https://cdn.shadcnblocks.com/shadcnblocks/block/badges/googleplay.png", alt: "Disponível na loja de aplicativos" },
}

export function DownloadPlatformsBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const platforms = p.items ?? []
  return <section className="builder-block builder-block--spacious bg-muted/50">
    <div className="container mx-auto flex flex-col gap-10 @4xl:gap-12">
      <header className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
        <h2 className="text-4xl font-bold tracking-tight @md:text-5xl @4xl:text-6xl"><InlineText editor={editor} target={{kind:"property",key:"title"}} value={p.title} label="título" /></h2>
        <InlineText editor={editor} target={{kind:"property",key:"description"}} value={p.description} label="descrição" as="p" multiline className="text-lg text-muted-foreground" />
      </header>
      <div className="mx-auto grid w-full max-w-4xl gap-8 @md:grid-cols-3 @md:gap-6">
        {platforms.map((item) => {
          const kind = item.value as keyof typeof icons
          const Icon = icons[kind] ?? Monitor
          const badge = kind === "ios" || kind === "android" ? badges[kind] : undefined
          return <article key={item.id} className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-background shadow-sm"><Icon className="size-8" aria-hidden="true" /></div>
            <h3 className="text-xl font-semibold"><InlineText editor={editor} target={{kind:"item",id:item.id,key:"title"}} value={item.title} label="plataforma" /></h3>
            <InlineText editor={editor} target={{kind:"item",id:item.id,key:"description"}} value={item.description} label="descrição da plataforma" as="p" multiline className="min-h-10 text-sm text-muted-foreground" />
            {badge ? <a href={safeHref(item.href)} className="pointer-events-auto inline-flex" data-inline-editor-control="" aria-label={`${item.features[2]||badge.alt}: ${item.title}`}><InlineImage editor={editor} url={item.features[1]||badge.src} alt={item.features[2]||badge.alt} target={{kind:"item-feature",id:item.id,index:1}} altTarget={{kind:"item-feature",id:item.id,index:2}} className="inline-flex"><img src={safeImageUrl(item.features[1]||badge.src)} alt={item.features[2]||badge.alt} className="h-10 w-auto" /></InlineImage></a> : <Button size="lg" render={<a href={safeHref(item.href)} />} nativeButton={false}><Download className="size-4" aria-hidden="true" /><InlineText editor={editor} target={{kind:"item-feature",id:item.id,index:0}} value={item.features[0] ?? p.button} label="texto do botão" focusable={false} /></Button>}
          </article>
        })}
      </div>
    </div>
  </section>
}
