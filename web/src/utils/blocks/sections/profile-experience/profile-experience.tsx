import { BookOpen, BriefcaseBusiness, FlaskConical, GraduationCap, HeartHandshake, Medal, Trophy } from "lucide-react"
import { BouncyAccordion } from "@/components/motion/bouncy-accordion"
import { InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

function experienceIcon(id: string, title: string) {
  const key = `${id} ${title}`.toLowerCase()
  if (/ifrr?j|form|gradua|bacharel|univers/.test(key)) return GraduationCap
  if (/leste|ventrium|desenvolv|estagi|trabalho|empresa/.test(key)) return BriefcaseBusiness
  if (/faperj|cnpq|pesquis|iniciação/.test(key)) return FlaskConical
  if (/oiagro|prêmio|solução|award/.test(key)) return Trophy
  if (/aws|cisco|certifica|curso|academy/.test(key)) return BookOpen
  if (/monitor|volunt|apoio/.test(key)) return HeartHandshake
  return Medal
}

export function ProfileExperienceBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  return (
    <section id="experiencia" className="w-full min-w-0 max-w-full overflow-x-clip bg-background px-6 py-24 text-foreground sm:px-8 md:py-32 lg:px-12">
      <div className="mx-auto min-w-0 max-w-3xl">
        <header className="min-w-0"><p className="break-words text-xs font-medium uppercase tracking-widest text-muted-foreground"><InlineText editor={editor} target={{ kind: "property", key: "eyebrow" }} value={p.eyebrow} label="rótulo da seção" /></p><h2 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl"><InlineText editor={editor} target={{ kind: "property", key: "title" }} value={p.title} label="título" /></h2>{p.description ? <InlineText editor={editor} target={{ kind: "property", key: "description" }} value={p.description} label="descrição" as="p" multiline className="mt-3 block max-w-lg break-words text-sm leading-6 text-muted-foreground" /> : null}</header>
        <BouncyAccordion defaultValue={p.items?.[0]?.id ?? null} className="mt-10 min-w-0 max-w-full overflow-hidden rounded-[28px]" classNames={{ item: "min-w-0 max-w-full border-b border-border last:border-b-0 bg-card text-card-foreground", trigger: "min-h-[58px] min-w-0 max-w-full px-4 text-foreground hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5", icon: "shrink-0 text-muted-foreground", title: "min-w-0 break-words whitespace-normal text-left text-[15px] font-medium text-foreground", chevron: "shrink-0 text-muted-foreground", content: "min-w-0 max-w-full bg-secondary/45", description: "min-w-0 max-w-full break-words px-4 pb-5 text-[15px] leading-6 text-muted-foreground sm:px-5" }} items={(p.items ?? []).map((item) => {
          const Icon = experienceIcon(item.id, item.title)
          return {
            id: item.id,
            icon: <Icon size={17} aria-hidden="true" />,
            title: <InlineText editor={editor} focusable={false} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="instituição" />,
            description: <div className="space-y-2"><div><p className="text-sm font-semibold text-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "description" }} value={item.description} label="formação ou cargo" /></p><p className="mb-2 text-xs font-medium text-muted-foreground"><InlineText editor={editor} target={{ kind: "item", id: item.id, key: "value" }} value={item.value} label="instituição e período" /></p></div>{item.features.length ? <ul className="list-disc space-y-1.5 pl-4 marker:text-muted-foreground">{item.features.map((feature, featureIndex) => <li key={`${item.id}-${featureIndex}`}><InlineText editor={editor} target={{ kind: "item-feature", id: item.id, index: featureIndex }} value={feature} label="realização ou detalhe" /></li>)}</ul> : null}</div>,
          }
        })} />
      </div>
    </section>
  )
}
