"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

type DebouncedSliderProps = Omit<
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
  "value" | "onValueChange" | "onValueCommit"
> & {
  value: number[]
  onValueCommit: (value: number[]) => void
}

function DebouncedSlider({ value, onValueCommit, className, ...props }: DebouncedSliderProps) {
  const [localValue, setLocalValue] = React.useState(value)
  const dragging = React.useRef(false)
  const lastEmittedRef = React.useRef<number[] | null>(null)

  const arraysEqual = React.useCallback((a: number[], b: number[]) => {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false
    }
    return true
  }, [])

  // Sync from parent when not dragging (e.g. undo/redo, preset load)
  React.useEffect(() => {
    if (!dragging.current) setLocalValue(value)
  }, [value])

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      value={localValue}
      onValueChange={(v) => {
        dragging.current = true
        setLocalValue(v)
        lastEmittedRef.current = v
        onValueCommit(v)
      }}
      onValueCommit={(v) => {
        dragging.current = false
        if (!lastEmittedRef.current || !arraysEqual(lastEmittedRef.current, v)) {
          onValueCommit(v)
        }
        lastEmittedRef.current = null
      }}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
}

export { Slider, DebouncedSlider }
