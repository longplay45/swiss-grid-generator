import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type HoverTooltipProps = {
  label: ReactNode
  children: ReactNode
  className?: string
  tooltipClassName?: string
}

export function HoverTooltip({
  label,
  children,
  className,
  tooltipClassName,
}: HoverTooltipProps) {
  return (
    <div className={cn("group relative", className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-40 rounded border px-2 py-1 text-[11px] opacity-0 shadow-sm transition-opacity duration-75 group-hover:opacity-100 group-focus-within:opacity-100",
          tooltipClassName,
        )}
      >
        {label}
      </div>
    </div>
  )
}
