import type { MouseEvent, ReactNode } from "react"

import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

type SectionHeaderRowProps = {
  label: ReactNode
  value?: ReactNode
  statusDotClassName?: string | null
  actionIcon?: ReactNode
  actions?: ReactNode
  actionLabel?: string
  onActionClick?: () => void
  onRowClick?: () => void
  onRowDoubleClick?: (event: MouseEvent<HTMLButtonElement>) => void
  ariaExpanded?: boolean
  className?: string
  labelClassName?: string
  valueClassName?: string
  actionClassName?: string
}

export function SectionHeaderRow({
  label,
  value,
  statusDotClassName,
  actionIcon,
  actions,
  actionLabel,
  onActionClick,
  onRowClick,
  onRowDoubleClick,
  ariaExpanded,
  className = "",
  labelClassName = "",
  valueClassName = "",
  actionClassName = "",
}: SectionHeaderRowProps) {
  const rowClassName = `flex min-h-[18px] w-full items-center justify-between gap-2 ${className}`.trim()
  const leftContent = (
    <span className="flex min-w-0 items-center gap-2">
      <span className={`${SECTION_HEADLINE_CLASSNAME} leading-none ${labelClassName}`.trim()}>
        {label}
      </span>
      {value !== undefined || statusDotClassName ? (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {statusDotClassName ? (
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white dark:ring-[#1D232D] ${statusDotClassName}`}
            />
          ) : null}
          {value !== undefined ? (
            <span className={`min-w-0 truncate text-[11px] leading-none ${valueClassName}`.trim()}>
              {value}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )
  const actionContent = actionIcon ? (
    <span
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${actionClassName}`.trim()}
    >
      {actionIcon}
    </span>
  ) : null
  const rightContent = actions ?? actionContent

  if (onRowClick) {
    return (
      <button
        type="button"
        className={`${rowClassName} text-left`}
        aria-expanded={ariaExpanded}
        onClick={onRowClick}
        onDoubleClick={onRowDoubleClick}
      >
        {leftContent}
        {rightContent}
      </button>
    )
  }

  return (
    <div className={rowClassName}>
      {leftContent}
      {actions ? actions : actionContent && onActionClick ? (
        <button
          type="button"
          aria-label={actionLabel}
          onClick={onActionClick}
          className="inline-flex"
        >
          {actionContent}
        </button>
      ) : actionContent}
    </div>
  )
}
