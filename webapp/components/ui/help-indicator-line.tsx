import { cn } from "@/lib/utils"

type HelpIndicatorLineProps = {
  className?: string
}

export function HelpIndicatorLine({ className }: HelpIndicatorLineProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-0 top-0 z-10 h-px rounded-full bg-[#fe9f97]", className)}
    />
  )
}
