import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CSSProperties } from "react"

export type FontOption = {
  value: string
  label: string
  category: string
}

type Props = {
  value: string
  onValueChange: (value: string) => void
  options: FontOption[]
  triggerClassName?: string
  fitToLongestOption?: boolean
}

const FONT_GROUPS = [
  { key: "Sans-Serif", label: "Sans-Serif" },
  { key: "Serif", label: "Serif" },
  { key: "Display", label: "Poster" },
] as const

export function FontSelect({
  value,
  onValueChange,
  options,
  triggerClassName,
  fitToLongestOption = false,
}: Props) {
  const triggerStyle: CSSProperties | undefined = fitToLongestOption
    ? { minWidth: `${Math.max(10, options.reduce((max, option) => Math.max(max, option.label.length), 0) + 4)}ch` }
    : undefined

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName} style={triggerStyle}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FONT_GROUPS.map((group, index) => {
          const groupOptions = options.filter((option) => option.category === group.key)
          if (!groupOptions.length) return null
          return (
            <SelectGroup key={group.key}>
              <SelectLabel>{group.label}</SelectLabel>
              {groupOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              {index < FONT_GROUPS.length - 1 && <SelectSeparator />}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
