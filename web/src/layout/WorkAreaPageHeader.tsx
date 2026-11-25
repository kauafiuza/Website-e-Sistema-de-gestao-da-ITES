import type { ReactNode } from "react"

interface WorkAreaPageHeaderProps {
  title: string
  description: string
  action?: ReactNode
}

export function WorkAreaPageHeader({
  title,
  description,
  action,
}: WorkAreaPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold text-pretty">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}
