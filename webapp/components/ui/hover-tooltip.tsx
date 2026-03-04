import { cn } from "@/lib/utils"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

type HoverTooltipProps = {
  label: ReactNode
  children: ReactNode
  className?: string
  tooltipClassName?: string
  constrainToViewport?: boolean
  viewportPaddingPx?: number
}

export function HoverTooltip({
  label,
  children,
  className,
  tooltipClassName,
  constrainToViewport = false,
  viewportPaddingPx = 12,
}: HoverTooltipProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [horizontalNudge, setHorizontalNudge] = useState(0)

  const updateHorizontalNudge = useCallback(() => {
    if (!constrainToViewport || !isActive || typeof window === "undefined") return
    const node = tooltipRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const minX = viewportPaddingPx
    const maxX = window.innerWidth - viewportPaddingPx
    if (rect.left < minX) {
      setHorizontalNudge(minX - rect.left)
      return
    }
    if (rect.right > maxX) {
      setHorizontalNudge(maxX - rect.right)
      return
    }
    setHorizontalNudge(0)
  }, [constrainToViewport, isActive, viewportPaddingPx])

  useEffect(() => {
    if (!constrainToViewport || !isActive) {
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
  }, [constrainToViewport, isActive, updateHorizontalNudge])

  return (
    <div
      ref={wrapperRef}
      className={cn("group relative", className)}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocusCapture={() => setIsActive(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget
        if (!(nextTarget instanceof Node) || !wrapperRef.current?.contains(nextTarget)) {
          setIsActive(false)
        }
      }}
    >
      {children}
      <div
        ref={tooltipRef}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-40 rounded border px-2 py-1 text-[11px] opacity-0 shadow-sm transition-opacity duration-75 group-hover:opacity-100 group-focus-within:opacity-100",
          tooltipClassName,
        )}
        style={constrainToViewport ? { marginLeft: `${horizontalNudge}px` } : undefined}
      >
        {label}
      </div>
    </div>
  )
}
