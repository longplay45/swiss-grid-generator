import { useCallback, useEffect, useMemo, useState } from "react"
import { getUiThemeColor } from "@/lib/theme-color"

export type WorkspaceTheme = {
  root: string
  leftPanel: string
  leftPanelEdit: string
  subtleBorder: string
  bodyText: string
  headingText: string
  link: string
  previewShell: string
  previewHeader: string
  previewContent: string
  previewContentEdit: string
  divider: string
  sidebar: string
  sidebarHeading: string
  sidebarBody: string
}

const DARK_THEME: WorkspaceTheme = {
  root: "bg-[#161A22]",
  leftPanel: "dark border-[#313A47] bg-[#1D232D] text-[#F4F6F8]",
  leftPanelEdit: "bg-[#1D232D]",
  subtleBorder: "border-[#313A47]",
  bodyText: "text-[#A8B1BF]",
  headingText: "text-[#F4F6F8]",
  link: "text-[#F4F6F8] underline",
  previewShell: "bg-[#161A22]",
  previewHeader: "dark border-[#313A47] bg-[#1D232D] text-[#F4F6F8]",
  previewContent: "bg-[#161A22]",
  previewContentEdit: "bg-[#161A22]",
  divider: "bg-[#313A47]",
  sidebar: "dark border-[#313A47] bg-[#1D232D] text-[#A8B1BF]",
  sidebarHeading: "text-[#F4F6F8]",
  sidebarBody: "text-[#8D98AA]",
}

const LIGHT_THEME: WorkspaceTheme = {
  root: "bg-gray-100",
  leftPanel: "border-gray-200 bg-gray-100",
  leftPanelEdit: "bg-gray-100",
  subtleBorder: "border-gray-200",
  bodyText: "text-gray-600",
  headingText: "text-gray-700",
  link: "underline",
  previewShell: "bg-gray-100",
  previewHeader: "border-gray-200 bg-gray-100",
  previewContent: "bg-gray-100",
  previewContentEdit: "bg-gray-100",
  divider: "bg-gray-200",
  sidebar: "border-gray-200 bg-gray-100 text-gray-700",
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

  useEffect(() => {
    if (typeof document === "undefined") return

    const content = getUiThemeColor(isDarkUi)
    let meta = document.getElementById("app-theme-color")
    if (!(meta instanceof HTMLMetaElement)) {
      meta = document.createElement("meta")
      meta.setAttribute("id", "app-theme-color")
      meta.setAttribute("data-app-theme-color", "true")
      meta.setAttribute("name", "theme-color")
      document.head.appendChild(meta)
    }
    meta.setAttribute("content", content)
  }, [isDarkUi])

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
