type HelpIndicatorLineProps = {
  inset?: "icon" | "section"
}

export function HelpIndicatorLine({ inset = "section" }: HelpIndicatorLineProps) {
  const insetClassName = inset === "icon" ? "left-1 right-1" : "left-2 right-2"

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute ${insetClassName} top-0 h-0.5 rounded-full bg-blue-500`}
    />
  )
}
