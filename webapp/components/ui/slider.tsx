"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const TRACK_CLASS = "relative h-[2px] w-full grow overflow-hidden bg-primary/15"
const RANGE_CLASS = "absolute h-full min-w-[1px] min-h-[1px] bg-primary"
const THUMB_CLASS = "block h-3 w-3 border border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none  disabled:pointer-events-none disabled:opacity-50"

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
    <SliderPrimitive.Track className={TRACK_CLASS}>
      <SliderPrimitive.Range className={RANGE_CLASS} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={THUMB_CLASS} />
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
      <SliderPrimitive.Track className={TRACK_CLASS}>
        <SliderPrimitive.Range className={RANGE_CLASS} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={THUMB_CLASS} />
    </SliderPrimitive.Root>
  )
}

export { Slider, DebouncedSlider }
