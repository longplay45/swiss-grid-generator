import { cn } from "@/lib/utils"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

type HoverTooltipProps = {
  label: ReactNode
  children: ReactNode
  className?: string
  tooltipClassName?: string
  constrainToViewport?: boolean
  constrainToClosestSelector?: string
  viewportPaddingPx?: number
  disabled?: boolean
}

export function HoverTooltip({
  label,
  children,
  className,
  tooltipClassName,
  constrainToViewport = false,
  constrainToClosestSelector,
  viewportPaddingPx = 12,
  disabled = false,
}: HoverTooltipProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [horizontalNudge, setHorizontalNudge] = useState(0)

  const updateHorizontalNudge = useCallback(() => {
    const shouldConstrain = !disabled && (constrainToViewport || Boolean(constrainToClosestSelector))
    if (!shouldConstrain || !isActive || typeof window === "undefined") return
    const node = tooltipRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    let minX = viewportPaddingPx
    let maxX = window.innerWidth - viewportPaddingPx
    if (constrainToClosestSelector) {
      const boundary = wrapperRef.current?.closest(constrainToClosestSelector)
      if (boundary instanceof HTMLElement) {
        const boundaryRect = boundary.getBoundingClientRect()
        minX = boundaryRect.left + viewportPaddingPx
        maxX = boundaryRect.right - viewportPaddingPx
      }
    }
    if (rect.left < minX) {
      setHorizontalNudge(minX - rect.left)
      return
    }
    if (rect.right > maxX) {
      setHorizontalNudge(maxX - rect.right)
      return
    }
    setHorizontalNudge(0)
  }, [constrainToClosestSelector, constrainToViewport, disabled, isActive, viewportPaddingPx])

  useEffect(() => {
    const shouldConstrain = !disabled && (constrainToViewport || Boolean(constrainToClosestSelector))
    if (!shouldConstrain || !isActive) {
      setHorizontalNudge(0)
      return
    }
    updateHorizontalNudge()
    const handleViewportChange = () => updateHorizontalNudge()
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)
    return () => {
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [constrainToClosestSelector, constrainToViewport, disabled, isActive, updateHorizontalNudge])

  return (
    <div
      ref={wrapperRef}
      className={cn(!disabled && "group relative", className)}
      onMouseEnter={disabled ? undefined : () => setIsActive(true)}
      onMouseLeave={disabled ? undefined : () => setIsActive(false)}
      onFocusCapture={disabled ? undefined : () => setIsActive(true)}
      onBlurCapture={disabled ? undefined : (event) => {
        const nextTarget = event.relatedTarget
        if (!(nextTarget instanceof Node) || !wrapperRef.current?.contains(nextTarget)) {
          setIsActive(false)
        }
      }}
    >
      {children}
      {!disabled ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-40 rounded border px-2 py-1 text-[11px] opacity-0 shadow-sm transition-opacity duration-75 group-hover:opacity-100 group-focus-within:opacity-100",
            tooltipClassName,
          )}
          style={(constrainToViewport || constrainToClosestSelector)
            ? { marginLeft: `${horizontalNudge}px` }
            : undefined}
        >
          {label}
        </div>
      ) : null}
    </div>
  )
}
