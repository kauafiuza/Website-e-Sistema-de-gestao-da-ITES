"use client"

import { PanelBottomClose } from "lucide-react"
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react"
import { useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type FloatingDockItem = { id: string; title: string; icon: ReactNode; href: string }

export function FloatingDock({ items, className, onNavigate }: { items: FloatingDockItem[]; className?: string; onNavigate?: (href: string) => void }) {
  return <>
    <FloatingDockDesktop items={items} className={className} onNavigate={onNavigate} />
    <FloatingDockMobile items={items} className={className} onNavigate={onNavigate} />
  </>
}

function FloatingDockMobile({ items, className, onNavigate }: { items: FloatingDockItem[]; className?: string; onNavigate?: (href: string) => void }) {
  const [open, setOpen] = useState(false)
  return <div className={cn("relative block md:hidden", className)}>
    <AnimatePresence>
      {open ? <motion.div layoutId="ites-dock" className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2">
        {items.map((item, index) => <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10, transition: { delay: index * 0.05 } }} transition={{ delay: (items.length - 1 - index) * 0.05 }}>
          <a href={item.href} aria-label={item.title} title={item.title} data-editor-action="scroll" onClick={(event) => { if (!onNavigate) return; event.preventDefault(); onNavigate(item.href); setOpen(false) }} className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="size-4">{item.icon}</span></a>
        </motion.div>)}
      </motion.div> : null}
    </AnimatePresence>
    <button type="button" aria-label={open ? "Fechar navegação" : "Abrir navegação"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><PanelBottomClose className="size-5" aria-hidden="true" /></button>
  </div>
}

function FloatingDockDesktop({ items, className, onNavigate }: { items: FloatingDockItem[]; className?: string; onNavigate?: (href: string) => void }) {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY)
  return <motion.div onMouseMove={(event) => mouseX.set(event.pageX)} onMouseLeave={() => mouseX.set(Number.POSITIVE_INFINITY)} className={cn("mx-auto hidden h-16 max-w-[calc(100vw-2rem)] items-end gap-4 overflow-visible rounded-2xl border border-border bg-card px-4 pb-3 shadow-lg md:flex", className)}>
    {items.map((item) => <DockIcon key={item.id} item={item} mouseX={mouseX} onNavigate={onNavigate} />)}
  </motion.div>
}

function DockIcon({ item, mouseX, onNavigate }: { item: FloatingDockItem; mouseX: MotionValue<number>; onNavigate?: (href: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const distance = useTransform(mouseX, (x) => { const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }; return x - bounds.x - bounds.width / 2 })
  const size = useSpring(useTransform(distance, [-150, 0, 150], [40, 80, 40]), { mass: 0.1, stiffness: 150, damping: 12 })
  const iconSize = useSpring(useTransform(distance, [-150, 0, 150], [20, 40, 20]), { mass: 0.1, stiffness: 150, damping: 12 })
  const [hovered, setHovered] = useState(false)
  return <a href={item.href} aria-label={item.title} data-editor-action="scroll" onClick={(event) => { if (!onNavigate) return; event.preventDefault(); onNavigate(item.href) }} className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
    <motion.div ref={ref} style={{ width: size, height: size }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="relative flex aspect-square items-center justify-center rounded-full border border-border bg-accent text-accent-foreground">
      <AnimatePresence>{hovered ? <motion.span initial={{ opacity: 0, y: 10, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 2, x: "-50%" }} className="absolute -top-8 left-1/2 w-fit whitespace-pre rounded-md border border-border bg-popover px-2 py-0.5 text-xs text-popover-foreground shadow">{item.title}</motion.span> : null}</AnimatePresence>
      <motion.span style={{ width: iconSize, height: iconSize }} className="flex items-center justify-center">{item.icon}</motion.span>
    </motion.div>
  </a>
}
