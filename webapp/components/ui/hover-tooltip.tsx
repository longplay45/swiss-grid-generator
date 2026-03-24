import { cn } from "@/lib/utils"
import { useCallback, useLayoutEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

type HoverTooltipProps = {
  label: ReactNode
  children: ReactNode
  className?: string
  tooltipClassName?: string
  constrainToClosestSelector?: string
  viewportPaddingPx?: number
  disabled?: boolean
}

type TooltipPoint = {
  x: number
  y: number
}

const TOOLTIP_CURSOR_OFFSET_PX = 14

export function HoverTooltip({
  label,
  children,
  className,
  tooltipClassName,
  constrainToClosestSelector,
  viewportPaddingPx = 12,
  disabled = false,
}: HoverTooltipProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [anchorPoint, setAnchorPoint] = useState<TooltipPoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPoint | null>(null)

  const updateTooltipPosition = useCallback(() => {
    if (disabled || !isActive || !anchorPoint || typeof window === "undefined") return
    const node = tooltipRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()

    let minX = viewportPaddingPx
    let maxX = window.innerWidth - viewportPaddingPx
    let minY = viewportPaddingPx
    let maxY = window.innerHeight - viewportPaddingPx

    if (constrainToClosestSelector) {
      const boundary = wrapperRef.current?.closest(constrainToClosestSelector)
      if (boundary instanceof HTMLElement) {
        const boundaryRect = boundary.getBoundingClientRect()
        minX = Math.max(minX, boundaryRect.left + viewportPaddingPx)
        maxX = Math.min(maxX, boundaryRect.right - viewportPaddingPx)
        minY = Math.max(minY, boundaryRect.top + viewportPaddingPx)
        maxY = Math.min(maxY, boundaryRect.bottom - viewportPaddingPx)
      }
    }

    if (maxX < minX) {
      maxX = minX
    }
    if (maxY < minY) {
      maxY = minY
    }

    const minLeft = minX
    const maxLeft = Math.max(minLeft, maxX - rect.width)
    const nextLeft = Math.min(Math.max(anchorPoint.x - rect.width / 2, minLeft), maxLeft)

    const belowTop = anchorPoint.y + TOOLTIP_CURSOR_OFFSET_PX
    const aboveTop = anchorPoint.y - TOOLTIP_CURSOR_OFFSET_PX - rect.height
    const maxTop = Math.max(minY, maxY - rect.height)
    const preferredTop = belowTop + rect.height <= maxY || aboveTop < minY
      ? belowTop
      : aboveTop
    const nextTop = Math.min(Math.max(preferredTop, minY), maxTop)

    setTooltipPosition({ x: nextLeft, y: nextTop })
  }, [anchorPoint, constrainToClosestSelector, disabled, isActive, viewportPaddingPx])

  useLayoutEffect(() => {
    if (disabled || !isActive || !anchorPoint) {
      setTooltipPosition(null)
      return
    }
    updateTooltipPosition()
    const handleViewportChange = () => updateTooltipPosition()
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)
    return () => {
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [anchorPoint, disabled, isActive, updateTooltipPosition])

  const activateFromPointer = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setIsActive(true)
    setAnchorPoint({ x: event.clientX, y: event.clientY })
  }, [])

  const activateFromElement = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    setIsActive(true)
    setAnchorPoint({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
  }, [])

  return (
    <div
      ref={wrapperRef}
      className={cn(!disabled && "relative", className)}
      onMouseEnter={disabled ? undefined : activateFromPointer}
      onMouseMove={disabled ? undefined : activateFromPointer}
      onMouseLeave={disabled ? undefined : () => {
        setIsActive(false)
        setAnchorPoint(null)
      }}
      onFocusCapture={disabled ? undefined : activateFromElement}
      onBlurCapture={disabled ? undefined : (event) => {
        const nextTarget = event.relatedTarget
        if (!(nextTarget instanceof Node) || !wrapperRef.current?.contains(nextTarget)) {
          setIsActive(false)
          setAnchorPoint(null)
        }
      }}
    >
      {children}
      {!disabled ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "pointer-events-none fixed z-40 rounded border px-2 py-1 text-[11px] shadow-sm transition-opacity duration-75",
            isActive ? "opacity-100" : "opacity-0",
            tooltipPosition ? null : "invisible",
            tooltipClassName,
          )}
          style={tooltipPosition
            ? {
              left: tooltipPosition.x,
              top: tooltipPosition.y,
            }
            : undefined}
        >
          {label}
        </div>
      ) : null}
    </div>
  )
}
