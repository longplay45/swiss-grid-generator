"use client"

import type { ReactNode } from "react"

type Props = {
  label: ReactNode
  children: ReactNode
  className?: string
  labelClassName?: string
  controlClassName?: string
}

export function LabeledControlRow({
  label,
  children,
  className = "",
  labelClassName = "",
  controlClassName = "",
}: Props) {
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_156px] items-center gap-x-3 gap-y-2 ${className}`.trim()}>
      <div className={`min-w-0 ${labelClassName}`.trim()}>{label}</div>
      <div className={`min-w-0 ${controlClassName}`.trim()}>{children}</div>
    </div>
  )
}
