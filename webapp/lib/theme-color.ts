export const LIGHT_UI_THEME_COLOR = "#f3f4f6"
export const DARK_UI_THEME_COLOR = "#111827"

export function getUiThemeColor(isDarkMode: boolean) {
  return isDarkMode ? DARK_UI_THEME_COLOR : LIGHT_UI_THEME_COLOR
}
