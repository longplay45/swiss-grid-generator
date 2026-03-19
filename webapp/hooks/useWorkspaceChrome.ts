import { useCallback, useEffect, useMemo, useState } from "react"

export type WorkspaceTheme = {
  root: string
  leftPanel: string
  subtleBorder: string
  bodyText: string
  headingText: string
  link: string
  previewShell: string
  previewHeader: string
  divider: string
  sidebar: string
  sidebarHeading: string
  sidebarBody: string
}

const DARK_THEME: WorkspaceTheme = {
  root: "bg-gray-950",
  leftPanel: "dark border-gray-700 bg-gray-900 text-gray-100",
  subtleBorder: "border-gray-700",
  bodyText: "text-gray-300",
  headingText: "text-gray-300",
  link: "text-gray-100 underline",
  previewShell: "bg-gray-950",
  previewHeader: "dark border-gray-700 bg-gray-900 text-gray-100",
  divider: "bg-gray-700",
  sidebar: "dark border-gray-700 bg-gray-900 text-gray-300",
  sidebarHeading: "text-gray-100",
  sidebarBody: "text-gray-400",
}

const LIGHT_THEME: WorkspaceTheme = {
  root: "bg-gray-100",
  leftPanel: "border-gray-200 bg-white",
  subtleBorder: "border-gray-200",
  bodyText: "text-gray-600",
  headingText: "text-gray-700",
  link: "underline",
  previewShell: "bg-white",
  previewHeader: "border-gray-200 bg-white",
  divider: "bg-gray-200",
  sidebar: "border-gray-200 bg-white text-gray-700",
  sidebarHeading: "text-gray-900",
  sidebarBody: "text-gray-600",
}

export function useWorkspaceChrome() {
  const [isDarkUi, setIsDarkUi] = useState(false)
  const [showRolloverInfo, setShowRolloverInfo] = useState(true)
  const [isSmartphone, setIsSmartphone] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const applyTheme = (matches: boolean) => setIsDarkUi(matches)
    applyTheme(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => applyTheme(event.matches)
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const checkSmartphone = () => {
      setIsSmartphone(window.matchMedia("(max-width: 767px)").matches)
    }

    checkSmartphone()
    window.addEventListener("resize", checkSmartphone)
    return () => window.removeEventListener("resize", checkSmartphone)
  }, [])

  const toggleDarkUi = useCallback(() => {
    setIsDarkUi((prev) => !prev)
  }, [])

  const toggleRolloverInfo = useCallback(() => {
    setShowRolloverInfo((prev) => !prev)
  }, [])

  const uiTheme = useMemo(() => (
    isDarkUi ? DARK_THEME : LIGHT_THEME
  ), [isDarkUi])

  return {
    isDarkUi,
    setIsDarkUi,
    toggleDarkUi,
    showRolloverInfo,
    setShowRolloverInfo,
    toggleRolloverInfo,
    isSmartphone,
    uiTheme,
  }
}
