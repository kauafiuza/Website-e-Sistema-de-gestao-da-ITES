import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, Equal, Leaf, X } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import {
  InlineImage,
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import type { BlockProps, ContentItem } from "@/utils/blocks/types"
import { safeHref, safeImageUrl } from "@/utils/blocks/shared/urls"

const backgroundVideo =
  "https://images.shadcnspace.com/assets/video/hero05-banner-video.mp4"

export function HeroSpace03Block({
  props,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()
  const items: ContentItem[] = props.items ?? []
  const poster = safeImageUrl(props.imageUrl ?? "")

  useEffect(() => {
    const updateScroll = () => setHasScrolled(window.scrollY >= 80)
    updateScroll()
    window.addEventListener("scroll", updateScroll, { passive: true })
    return () => window.removeEventListener("scroll", updateScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [menuOpen])

  return (
    <section className="builder-block relative isolate overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <InlineImage
          editor={editor}
          url={props.imageUrl ?? ""}
          alt={props.imageAlt ?? ""}
          className="size-full rounded-none"
        >
          <video
            className="size-full object-cover"
            loop
            autoPlay={!reducedMotion}
            muted
            playsInline
            poster={poster || undefined}
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        </InlineImage>
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <header
        className={`relative z-20 flex h-20 items-center border-t-4 border-teal-400 transition-colors duration-500 ${hasScrolled ? "bg-teal-500" : "bg-transparent"}`}
      >
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6">
          <a href="#inicio" aria-label="Ir ao início" className="font-semibold tracking-tight">
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "eyebrow" }}
              value={props.eyebrow}
              label="marca da navegação"
              focusable={false}
            />
          </a>
          <button
            ref={triggerRef}
            type="button"
            className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
            data-inline-editor-control=""
            aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"}
            aria-expanded={menuOpen}
            aria-controls="hero-space-03-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Equal aria-hidden="true" />}
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Fechar menu"
                className="pointer-events-auto fixed inset-0 z-30 cursor-default bg-black/45 backdrop-blur-sm"
                data-inline-editor-control=""
                onClick={() => setMenuOpen(false)}
              />
              <div
                id="hero-space-03-navigation"
                className="absolute top-16 right-0 z-40 w-full max-w-md rounded-3xl border border-border bg-background p-6 text-foreground shadow-xl sm:p-8"
              >
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-lg font-medium">Navegação</p>
                  <button
                    type="button"
                    aria-label="Fechar navegação"
                    data-inline-editor-control=""
                    className="pointer-events-auto rounded-md p-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setMenuOpen(false)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
                <ul className="flex flex-col gap-4 border-t border-border pt-6">
                  {items.map((item) => (
                    <li key={item.id} className="group flex items-center gap-3">
                      <Leaf
                        aria-hidden="true"
                        className={`size-5 shrink-0 text-teal-500 transition-opacity ${item.value === "active" ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      />
                      <a
                        href={safeHref(item.href)}
                        className="pointer-events-auto text-2xl font-semibold leading-tight transition-colors hover:text-teal-600 sm:text-3xl"
                        data-inline-editor-control=""
                        onClick={() => setMenuOpen(false)}
                      >
                        <InlineText
                          editor={editor}
                          target={{ kind: "item", id: item.id, key: "title" }}
                          value={item.title}
                          label="link de navegação"
                          focusable={false}
                        />
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
                  <a className="pointer-events-auto w-fit hover:text-foreground" data-inline-editor-control="" href="tel:+551140001234">+55 11 4000-1234</a>
                  <a className="pointer-events-auto w-fit hover:text-foreground" data-inline-editor-control="" href="mailto:contato@exemplo.com">contato@exemplo.com</a>
                </div>
              </div>
            </>
          ) : null}
        </nav>
      </header>

      <div
        id="inicio"
        className="relative z-10 mx-auto flex min-h-[min(54rem,calc(100svh-5rem))] w-full max-w-7xl items-end"
      >
        <div className="flex w-full flex-col gap-5 py-10 sm:gap-7 sm:py-16">
          <div className="flex max-w-xl items-start gap-3 sm:gap-4">
            <motion.div
              aria-hidden="true"
              animate={reducedMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="mt-1 shrink-0 text-teal-300"
            >
              <Leaf className="size-9 sm:size-11" />
            </motion.div>
            <InlineText
              editor={editor}
              target={{ kind: "property", key: "description" }}
              value={props.description}
              label="descrição"
              as="p"
              multiline
              className="text-sm leading-6 text-white sm:text-base"
            />
          </div>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.45, ease: "easeInOut", delay: 0.15 }}
            className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between"
          >
            <h1 className="max-w-5xl text-4xl leading-[0.95] font-bold tracking-[-0.055em] sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl">
              <InlineText
                editor={editor}
                target={{ kind: "property", key: "title" }}
                value={props.title}
                label="título"
                multiline
                className="block"
              />
            </h1>
            <a
              href={safeHref(props.href)}
              className="pointer-events-auto inline-flex shrink-0 items-center gap-5 rounded-full bg-teal-400 p-1 pl-7 text-black transition-transform hover:scale-105"
              data-inline-editor-control=""
              aria-label={props.button}
            >
              <span className="text-sm font-semibold sm:text-base">
                <InlineText
                  editor={editor}
                  target={{ kind: "property", key: "button" }}
                  value={props.button}
                  label="texto do botão"
                  focusable={false}
                />
              </span>
              <span className="flex size-11 items-center justify-center rounded-full bg-white text-black sm:size-14">
                <ArrowUpRight aria-hidden="true" className="size-6" />
              </span>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
