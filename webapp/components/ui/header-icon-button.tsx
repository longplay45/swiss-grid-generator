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
  showTooltip?: boolean
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
  showTooltip = true,
  "aria-pressed": ariaPressed,
}: HeaderIconButtonProps) {
  return (
    <HoverTooltip
      label={tooltip}
      disabled={!showTooltip}
      tooltipClassName="w-max whitespace-pre-line text-center border-gray-200 bg-gray-100/95 text-gray-700 shadow-lg dark:border-[#313A47] dark:bg-[#1D232D]/95 dark:text-[#F4F6F8]"
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
