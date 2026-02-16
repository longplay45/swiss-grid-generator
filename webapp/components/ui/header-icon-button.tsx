import { Button } from "@/components/ui/button"
import type { ButtonProps } from "@/components/ui/button"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type HeaderIconButtonProps = {
  ariaLabel: string
  tooltip: string
  children: ReactNode
  buttonClassName?: string
} & Pick<ButtonProps, "variant" | "disabled" | "onClick"> & {
    "aria-pressed"?: boolean
  }

export function HeaderIconButton({
  ariaLabel,
  tooltip,
  children,
  variant = "outline",
  disabled,
  onClick,
  buttonClassName,
  "aria-pressed": ariaPressed,
}: HeaderIconButtonProps) {
  return (
    <HoverTooltip
      label={tooltip}
      tooltipClassName="left-1/2 top-full mt-2 w-max -translate-x-1/2 whitespace-pre-line text-center border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
    >
      <Button
        size="icon"
        variant={variant}
        className={cn("h-8 w-8", buttonClassName)}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </Button>
    </HoverTooltip>
  )
}
