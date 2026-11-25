
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { Card } from "@/components/motion/card"
import { ShaderBackground } from "@/components/motion/shader-background"
import { webPaths } from "@/router/helpers/route-paths"
import symbol from "@/assets/brand/ites-mark.svg"

interface AuthShellProps {
  children: ReactNode
  eyebrow?: string
  title: string
  description?: ReactNode
  footer?: ReactNode
  backToEditor?: boolean
}

const backgroundColors = [
  "#24724f",
  "#174d38",
  "#c78d26",
  "#206747",
]

const formStyles = [
  "mt-6",
  "[&_input]:text-base",
  "[&_label]:text-sm",
  "[&_[data-state]]:rounded-lg",
  "[&_[data-state]]:border-white/[0.085]",
  "[&_[data-state]]:bg-[#22242a]",
  "[&_[data-state=focused]]:border-[#7590ff]",
  "[&_[data-state=focused]]:shadow-[0_0_0_2px_rgba(77,101,249,0.12)]",
  "[&_[data-state=error]]:border-destructive",
].join(" ")

function AuthBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <ShaderBackground
          variant="grain-gradient"
          colorBack="#0c0d10"
          colors={backgroundColors}
          softness={0.7}
          intensity={0.65}
          noise={0.35}
          speed={0.2}
        />
      </div>

      <div
        className="pointer-events-none absolute -bottom-80 -left-72 size-[38rem] rounded-full border border-white/[0.035] max-sm:hidden"
        aria-hidden="true"
      />
    </>
  )
}

function AuthBrand() {
  return (
    <Link
      to={webPaths.login}
      aria-label="ITES — entrar"
      className="mx-auto flex w-fit items-center gap-3 rounded-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#24724f]">
        <img
          src={symbol}
          alt=""
          width="36"
          height="22"
        />
      </span>

      <span
        className="text-[1.125rem] font-semibold tracking-tight"
        translate="no"
      >
        ITES
      </span>
    </Link>
  )
}

function BackToEditorLink() {
  return (
    <Link
      to={webPaths.editor}
      className="mt-7 flex items-center justify-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <ArrowLeft
        className="size-4"
        aria-hidden="true"
      />
      Voltar ao editor
    </Link>
  )
}

export function AuthShell({
  children,
  title,
  description,
  footer,
  backToEditor = false,
}: AuthShellProps) {
  return (
    <div
      className="dark relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-[#0c0d10] px-4 py-8 text-foreground sm:px-6"
      style={{
        colorScheme: "dark",
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <a
        href="#auth-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3"
      >
        Ir para o conteúdo
      </a>

      <AuthBackground />

      <Card
        id="auth-content"
        variant="outlined"
        className="relative w-full max-w-[500px] gap-0 rounded-xl border-white/[0.065] bg-[#191b20] px-6 py-8 text-foreground shadow-[0_28px_80px_rgba(0,0,0,0.22)] sm:px-10 sm:py-9"
      >
        <AuthBrand />

        <h1 className="mt-7 text-center text-[1.875rem] font-semibold tracking-tight text-balance">
          {title}
        </h1>

        {description && (
          <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        )}

        <div className={formStyles}>
          {children}
        </div>

        {footer && (
          <div className="mt-5 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}

        {backToEditor && <BackToEditorLink />}
      </Card>
    </div>
  )
}
