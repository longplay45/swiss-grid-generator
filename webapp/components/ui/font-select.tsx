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
}: Props) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
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
