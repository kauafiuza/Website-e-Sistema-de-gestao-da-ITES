import { Loader, type LoaderVariant } from "@/components/motion/loader"
import { cn } from "@/lib/utils"

type PageLoaderLayout = "page" | "content" | "inline"

/**
 * Exibe o indicador universal de carregamento em páginas e áreas de conteúdo.
 *
 * @param label Descrição acessível do carregamento.
 */
export function PageLoader({
  icon = "dots",
  label = "Carregando…",
  layout = "page",
  size,
  className,
}: {
  icon?: LoaderVariant
  label?: string
  layout?: PageLoaderLayout
  size?: number
  className?: string
}) {
  const Container = layout === "inline" ? "span" : "div"
  const layoutClass = {
    page: "flex min-h-svh w-full items-center justify-center",
    content: "flex min-h-40 w-full items-center justify-center",
    inline: "inline-flex items-center justify-center",
  }[layout]
  const loaderSize = size ?? (layout === "inline" ? 16 : 32)

  return (
    <Container className={cn(layoutClass, className)}>
      <Loader variant={icon} label={label} size={loaderSize} />
    </Container>
  )
}
