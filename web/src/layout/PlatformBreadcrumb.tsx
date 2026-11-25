import { Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/motion/breadcrumb"
import { webPaths } from "@/router/helpers/route-paths"

interface BreadcrumbEntry { label: string; to: string }

export function PlatformBreadcrumb({ current, ancestors = [] }: { current: string; ancestors?: BreadcrumbEntry[] }) {
  return <Breadcrumb className="min-w-0 flex-1 rounded-md bg-background px-2 sm:px-3">
    <BreadcrumbList className="min-w-0 flex-nowrap gap-0" maxItems={4} overflowLabel="Mostrar caminhos anteriores">
      <BreadcrumbItem key="platform"><BreadcrumbLink render={(props) => <Link {...props} to={webPaths.projects} />}>ITES</BreadcrumbLink></BreadcrumbItem>
      {ancestors.map((entry) => <BreadcrumbItem key={entry.to}><BreadcrumbSeparator /><BreadcrumbLink render={(props) => <Link {...props} to={entry.to} />}>{entry.label}</BreadcrumbLink></BreadcrumbItem>)}
      <BreadcrumbItem key={current}><BreadcrumbSeparator /><BreadcrumbPage className="truncate">{current}</BreadcrumbPage></BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
}
