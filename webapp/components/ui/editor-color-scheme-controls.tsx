"use client"

import { Label } from "@/components/ui/label"
import { LabeledControlRow } from "@/components/ui/labeled-control-row"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PreviewItemHandlers = {
  onFocus?: () => void
  onMouseEnter?: () => void
  onMouseMove?: () => void
  onPointerEnter?: () => void
  onPointerMove?: () => void
}

type ColorSchemeOption = {
  id: string
  label: string
  colors: readonly string[]
}

type Props = {
  schemes: readonly ColorSchemeOption[]
  schemeValue: string
  onSchemeOpenChange: (open: boolean) => void
  onSchemeValueChange: (value: string) => void
  onSchemeContentPointerLeave: () => void
  getSchemeItemPreviewProps: (value: string) => PreviewItemHandlers
  displayedColors: readonly string[]
  selectedColor: string
  onColorSelect: (value: string) => void
  isDarkMode: boolean
  labelClassName: string
  triggerClassName?: string
  selectContentClassName?: string
  ringOffsetClassName?: string
}

export function EditorColorSchemeControls({
  schemes,
  schemeValue,
  onSchemeOpenChange,
  onSchemeValueChange,
  onSchemeContentPointerLeave,
  getSchemeItemPreviewProps,
  displayedColors,
  selectedColor,
  onColorSelect,
  isDarkMode,
  labelClassName,
  triggerClassName,
  selectContentClassName,
  ringOffsetClassName = "",
}: Props) {
  return (
    <>
      <div className="space-y-2">
        <LabeledControlRow label={<Label className={labelClassName}>Color Scheme</Label>}>
        <Select
          value={schemeValue}
          onOpenChange={onSchemeOpenChange}
          onValueChange={onSchemeValueChange}
        >
          <SelectTrigger className={triggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            className={selectContentClassName}
            side="top"
            sideOffset={4}
            avoidCollisions={false}
            onPointerLeave={onSchemeContentPointerLeave}
          >
            {schemes.map((scheme) => (
              <SelectItem
                key={scheme.id}
                value={scheme.id}
                {...getSchemeItemPreviewProps(scheme.id)}
              >
                {scheme.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </LabeledControlRow>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {displayedColors.map((color, index) => {
          const selected = selectedColor.toLowerCase() === color.toLowerCase()
          return (
            <div
              key={`${schemeValue}-${index}-${color}`}
              className="flex flex-col items-start gap-1"
            >
              <button
                type="button"
                onClick={() => onColorSelect(color)}
                className={`h-5 w-full rounded-sm border ${
                  isDarkMode ? "border-gray-700" : "border-gray-200"
                } ${selected ? `ring-2 ring-gray-500 ring-offset-1 ${ringOffsetClassName}` : ""}`}
                style={{ backgroundColor: color }}
                aria-label={`Select ${color}`}
                title={color}
              />
              <span className={`w-full text-left text-[9px] font-mono leading-none ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                {color.toLowerCase()}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
