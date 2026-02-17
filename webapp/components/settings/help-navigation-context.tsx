import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import type { SectionKey } from "@/hooks/useSettingsHistory"

type SettingsHelpNavigationValue = {
  showHelpIcons: boolean
  onNavigate: (section: SectionKey) => void
}

const DEFAULT_VALUE: SettingsHelpNavigationValue = {
  showHelpIcons: false,
  onNavigate: () => {},
}

const SettingsHelpNavigationContext = createContext<SettingsHelpNavigationValue>(DEFAULT_VALUE)

type ProviderProps = {
  value: SettingsHelpNavigationValue
  children: ReactNode
}

export function SettingsHelpNavigationProvider({ value, children }: ProviderProps) {
  return (
    <SettingsHelpNavigationContext.Provider value={value}>
      {children}
    </SettingsHelpNavigationContext.Provider>
  )
}

export function useSettingsHelpNavigation() {
  return useContext(SettingsHelpNavigationContext)
}
