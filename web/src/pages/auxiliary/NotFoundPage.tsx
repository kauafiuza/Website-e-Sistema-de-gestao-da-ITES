import { NotFoundGlitch } from "@/components/motion/not-found/glitch";
import type { NotFoundProps } from "@/components/motion/not-found/shared";
import { webPaths } from "@/router/helpers/route-paths";

/**
 * Renderiza a página exibida quando nenhuma rota corresponde à URL.
 */
export function NotFoundPage(props: NotFoundProps) {
  return (
    <div className="min-h-screen min-w-screen flex justify-center align-middle items-center">
      <NotFoundGlitch
        {...props}
        title="Página não encontrada!"
        description={`A página pode ter sido removida ou o caminho: "${window.location.pathname}" pode estar incorreto.`}
        homeHref={webPaths.projects}
      />  
    </div>
  )
}