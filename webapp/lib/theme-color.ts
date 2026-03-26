export const LIGHT_UI_THEME_COLOR = "#ffffff"
export const DARK_UI_THEME_COLOR = "#111827"

export function getUiThemeColor(isDarkMode: boolean) {
  return isDarkMode ? DARK_UI_THEME_COLOR : LIGHT_UI_THEME_COLOR
}
