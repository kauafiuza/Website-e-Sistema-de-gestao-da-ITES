import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"

const linkProps = (item: ContentItem) => ({
  href: safeHref(item.href),
  ...(item.target === "_blank" ? { target: "_blank", rel: "noopener noreferrer" } : {}),
})

export function NavbarClassicBlock({ props: p, editor }: { props: BlockProps; editor?: InlineEditor }) {
  const items = p.items ?? []
  const topLevel = items.filter((item) => !item.features[0] || !items.some((candidate) => candidate.id === item.features[0]))
  const childrenFor = (parent: ContentItem) => items.filter((item) => item.features[0] === parent.id)
  const logo = safeImageUrl(p.imageUrl ?? "")
  return (
    <nav aria-label="Navegação principal" className="builder-block builder-block--compact flex flex-wrap items-center justify-between gap-5 border-b bg-background px-4 py-3">
      <a href={safeHref(p.logoHref ?? "#")} className="flex items-center gap-2 text-xl font-bold" aria-label={p.title}>
        {logo ? <InlineImage editor={editor} url={logo} alt={p.imageAlt ?? p.title}><img src={logo} alt={p.imageAlt ?? p.title} className="max-h-9 w-auto object-contain" /></InlineImage> : null}
        <InlineText editor={editor} focusable={false} target={{ kind: "property", key: "title" }} value={p.title} label="título do site" />
      </a>
      <NavigationMenu className="hidden md:flex">
        <NavigationMenuList>
          {topLevel.map((item) => {
            const children = childrenFor(item)
            return children.length ? (
              <NavigationMenuItem key={item.id}>
                <NavigationMenuTrigger><InlineText editor={editor} focusable={false} target={{ kind: "item", id: item.id, key: "title" }} value={item.title} label="texto da navegação" /></NavigationMenuTrigger>
                <NavigationMenuContent className="w-64 p-2">
                  <div className="flex flex-col gap-1">
                    <NavigationMenuLink {...linkProps(item)} className="w-full">{item.title}</NavigationMenuLink>
                    {children.map((child) => <NavigationMenuLink key={child.id} {...linkProps(child)} className="w-full">{child.title}</NavigationMenuLink>)}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ) : <NavigationMenuItem key={item.id}><NavigationMenuLink {...linkProps(item)}>{item.title}</NavigationMenuLink></NavigationMenuItem>
          })}
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex items-center gap-2 md:hidden">
        <Accordion className="flex flex-col gap-2">
          {topLevel.map((item) => {
            const children = childrenFor(item)
            return children.length ? <AccordionItem key={item.id} value={item.id} className="border-0">
              <AccordionTrigger className="py-1">{item.title}</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2">{[item, ...children].map((child) => <a key={child.id} {...linkProps(child)} className="text-sm">{child.title}</a>)}</AccordionContent>
            </AccordionItem> : <a key={item.id} {...linkProps(item)} className="text-sm">{item.title}</a>
          })}
        </Accordion>
      </div>
      {p.showThemeToggle ? <Button type="button" variant="ghost" size="icon" aria-label="Alternar tema" onClick={() => window.dispatchEvent(new Event("builder:toggle-theme"))}>{<Sun className="hidden dark:block" aria-hidden="true" />}<Moon className="dark:hidden" aria-hidden="true" /></Button> : null}
    </nav>
  )
}
