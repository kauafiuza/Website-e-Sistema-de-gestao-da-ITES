import {
  Book,
  Menu,
  Moon,
  Sunset,
  Sun,
  Trees,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useId } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing";
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls";
import type { BlockProps, ContentItem } from "@/utils/blocks/types";

const menuIcons: Record<string, LucideIcon> = {
  book: Book,
  trees: Trees,
  sunset: Sunset,
  zap: Zap,
};

function MenuLinkContent({
  item,
  editor,
}: {
  item: ContentItem;
  editor?: InlineEditor;
}) {
  const Icon = menuIcons[item.features[1]];
  return (
    <>
      <div className="mt-1 text-foreground">
        {Icon ? <Icon className="size-5 shrink-0" aria-hidden="true" /> : null}
      </div>
      <div>
        <div className="text-sm font-semibold">
          <InlineText
            editor={editor}
            focusable={false}
            target={{ kind: "item", id: item.id, key: "title" }}
            value={item.title}
            label="texto do submenu"
          />
        </div>
        {item.description ? (
          <p className="text-sm leading-snug text-muted-foreground">
            <InlineText
              editor={editor}
              focusable={false}
              target={{ kind: "item", id: item.id, key: "description" }}
              value={item.description}
              label="descrição do submenu"
              multiline
            />
          </p>
        ) : null}
      </div>
    </>
  );
}

const linkProps = (item: ContentItem) => ({
  href: safeHref(item.href),
  ...(item.target === "_blank" ? { target: "_blank", rel: "noopener noreferrer" } : {}),
})

export function NavbarMegaMenuBlock({
  props: p,
  editor,
}: {
  props: BlockProps;
  editor?: InlineEditor;
}) {
  const mobileId = useId();
  const allItems = p.items ?? [];
  const menuItems = allItems.filter((item) => item.value === "nav");
  const childrenFor = (parent: ContentItem) =>
    menuItems.filter((item) => item.features[0] === parent.id);
  const topLevelItems = menuItems.filter(
    (item) => !item.features[0] || !menuItems.some((candidate) => candidate.id === item.features[0]),
  );
  const login = allItems.find((item) => item.value === "login");
  const signup = allItems.find((item) => item.value === "signup");

  const renderAccountAction = (item: ContentItem, variant: "outline" | "default") => (
    <Button
      type="button"
      variant={variant}
      size="sm"
      nativeButton={false}
      role="link"
      className="pointer-events-auto"
      data-inline-editor-control=""
      render={<a href={safeHref(item.href)} />}
    >
      <InlineText
        editor={editor}
        focusable={false}
        target={{ kind: "item", id: item.id, key: "title" }}
        value={item.title}
        label={item.value === "login" ? "texto do login" : "texto do cadastro"}
      />
    </Button>
  );

  return (
    <section className="builder-block builder-block--compact bg-background">
      <div className="container mx-auto">
        <nav aria-label="Navegação principal" className="hidden grid-cols-[1fr_auto_1fr] items-center lg:grid">
          <a
            href={safeHref(p.logoHref ?? p.href)}
            className="flex items-center gap-2 justify-self-start"
            aria-label={p.title}
          >
            <InlineImage
              editor={editor}
              url={safeImageUrl(p.imageUrl ?? "")}
              alt={p.imageAlt ?? p.title}
            >
              <img
                src={safeImageUrl(p.imageUrl ?? "")}
                className="max-h-8"
                alt={p.imageAlt ?? p.title}
              />
            </InlineImage>
            <span className="text-lg font-semibold tracking-tighter">
              <InlineText
                editor={editor}
                focusable={false}
                target={{ kind: "property", key: "title" }}
                value={p.title}
                label="nome da marca"
              />
            </span>
          </a>

          <NavigationMenu className="justify-self-center">
            <NavigationMenuList>
              {topLevelItems.map((item) => {
                const children = childrenFor(item);
                if (children.length) {
                  return (
                    <NavigationMenuItem key={item.id}>
                      <NavigationMenuTrigger
                        className="pointer-events-auto"
                        data-inline-editor-control=""
                      >
                        <InlineText
                          editor={editor}
                          focusable={false}
                          target={{ kind: "item", id: item.id, key: "title" }}
                          value={item.title}
                          label="texto da navegação"
                        />
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="w-72 p-1">
                        {children.map((child) => (
                          <NavigationMenuLink
                            key={child.id}
                            {...linkProps(child)}
                            className="pointer-events-auto flex w-full flex-row items-start gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-muted hover:text-accent-foreground"
                            data-inline-editor-control=""
                          >
                            <MenuLinkContent item={child} editor={editor} />
                          </NavigationMenuLink>
                        ))}
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                }
                return (
                  <NavigationMenuItem key={item.id}>
                    <NavigationMenuLink
                      {...linkProps(item)}
                      className="group pointer-events-auto inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground"
                      data-inline-editor-control=""
                    >
                      <InlineText
                        editor={editor}
                        focusable={false}
                        target={{ kind: "item", id: item.id, key: "title" }}
                        value={item.title}
                        label="texto da navegação"
                      />
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex gap-2 justify-self-end">
            {p.showThemeToggle ? <Button type="button" variant="ghost" size="icon" aria-label="Alternar tema" onClick={() => window.dispatchEvent(new Event("builder:toggle-theme"))}><Sun className="hidden dark:block" aria-hidden="true" /><Moon className="dark:hidden" aria-hidden="true" /></Button> : null}
            {login ? renderAccountAction(login, "outline") : null}
            {signup ? renderAccountAction(signup, "default") : null}
          </div>
        </nav>

        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <a href={safeHref(p.logoHref ?? p.href)} className="flex items-center gap-2" aria-label={p.title}>
              <InlineImage
                editor={editor}
                url={safeImageUrl(p.imageUrl ?? "")}
                alt={p.imageAlt ?? p.title}
              >
                <img
                  src={safeImageUrl(p.imageUrl ?? "")}
                  className="max-h-8"
                  alt={p.imageAlt ?? p.title}
                />
              </InlineImage>
            </a>
            <Sheet>
              <SheetTrigger
                render={<Button variant="outline" size="icon" />}
                className="pointer-events-auto"
                data-inline-editor-control=""
                aria-label="Abrir menu"
              >
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <a href={safeHref(p.logoHref ?? p.href)} className="flex items-center gap-2">
                      <InlineImage
                        editor={editor}
                        url={safeImageUrl(p.imageUrl ?? "")}
                        alt={p.imageAlt ?? p.title}
                      >
                        <img
                          src={safeImageUrl(p.imageUrl ?? "")}
                          className="max-h-8"
                          alt={p.imageAlt ?? p.title}
                        />
                      </InlineImage>
                      <span>{p.title}</span>
                    </a>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-4">
                  <Accordion className="flex w-full flex-col gap-4">
                    {topLevelItems.map((item) => {
                      const children = childrenFor(item);
                      if (children.length) {
                        return (
                          <AccordionItem key={item.id} value={`${mobileId}-${item.id}`} className="border-b-0">
                            <AccordionTrigger
                              className="pointer-events-auto py-0 text-md font-semibold hover:no-underline"
                              data-inline-editor-control=""
                            >
                              <InlineText
                                editor={editor}
                                focusable={false}
                                target={{ kind: "item", id: item.id, key: "title" }}
                                value={item.title}
                                label="texto da navegação"
                              />
                            </AccordionTrigger>
                            <AccordionContent className="mt-2">
                              {children.map((child) => (
                                <a
                                  key={child.id}
                                  {...linkProps(child)}
                                  className="pointer-events-auto flex flex-row items-start gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-muted hover:text-accent-foreground"
                                  data-inline-editor-control=""
                                >
                                  <MenuLinkContent item={child} editor={editor} />
                                </a>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      }
                      return (
                        <a
                          key={item.id}
                          {...linkProps(item)}
                          className="pointer-events-auto text-md font-semibold"
                          data-inline-editor-control=""
                        >
                          <InlineText
                            editor={editor}
                            focusable={false}
                            target={{ kind: "item", id: item.id, key: "title" }}
                            value={item.title}
                            label="texto da navegação"
                          />
                        </a>
                      );
                    })}
                  </Accordion>

                  <div className="flex flex-col gap-3">
                    {p.showThemeToggle ? <Button type="button" variant="outline" onClick={() => window.dispatchEvent(new Event("builder:toggle-theme"))}><Sun className="hidden dark:block" aria-hidden="true" /><Moon className="dark:hidden" aria-hidden="true" />Alternar tema</Button> : null}
                    {login ? renderAccountAction(login, "outline") : null}
                    {signup ? renderAccountAction(signup, "default") : null}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
}
