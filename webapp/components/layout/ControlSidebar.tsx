"use client"

import { memo, type ReactNode } from "react"

type UiTheme = {
  leftPanel: string
  leftPanelEdit: string
  subtleBorder: string
  bodyText: string
  link: string
}

type Props = {
  showPresetsBrowser: boolean
  showBetaBadge: boolean
  appVersion: string
  uiTheme: UiTheme
  settingsPanels: ReactNode
  editorMode: "text" | "image" | null
  onEditorHostChange: (node: HTMLDivElement | null) => void
  onToggleFeedbackPanel: () => void
  onToggleImprintPanel: () => void
}

export const ControlSidebar = memo(function ControlSidebar({
  showPresetsBrowser,
  showBetaBadge,
  appVersion,
  uiTheme,
  settingsPanels,
  editorMode,
  onEditorHostChange,
  onToggleFeedbackPanel,
  onToggleImprintPanel,
}: Props) {
  return (
    <div
      className={`w-full md:w-[280px] md:basis-[280px] md:shrink-0 flex max-h-[50vh] flex-col overflow-hidden border-r border-b transition-colors md:max-h-full md:border-b-0 ${uiTheme.leftPanel} ${
        editorMode ? uiTheme.leftPanelEdit : ""
      }`}
    >
      <div className={`shrink-0 space-y-2 border-b p-4 md:px-6 md:pt-6 ${uiTheme.subtleBorder}`}>
        <h1 className="text-3xl leading-[1] xfont-bold tracking-tight">Swiss Grid Generator</h1>
        <p className={`text-sm ${uiTheme.bodyText}`}>
          Based on Müller-Brockmann&apos;s <em><a href="https://amzn.to/40kfiUL">Grid Systems in Graphic Design</a></em> (1981).
          Copyleft &amp; -right 2026 by{" "}
          <a href="https://lp45.net" className={uiTheme.link}>lp45.net</a>.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${showPresetsBrowser ? "opacity-50" : ""}`}>
          {showPresetsBrowser ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10 cursor-not-allowed"
            />
          ) : null}

          {editorMode ? (
            <div
              ref={onEditorHostChange}
              data-editor-sidebar-host="true"
              data-editor-interactive-root="true"
              className="min-h-0 flex-1 overflow-hidden shadow-[inset_2px_0_0_0_#f97316,inset_0_2px_0_0_0_#f97316]"
            />
          ) : (
            settingsPanels
          )}
        </div>

        <div className={`shrink-0 border-t px-4 py-3 text-[11px] md:px-6 ${uiTheme.subtleBorder} ${uiTheme.bodyText}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              {showBetaBadge ? (
                <span className="inline-flex items-center rounded bg-red-600 px-2 py-0.5 font-medium text-white">Beta</span>
              ) : null}
              <span>V {appVersion}</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={uiTheme.link}
                onClick={onToggleFeedbackPanel}
              >
                Feedback
              </button>
              <button
                type="button"
                className={uiTheme.link}
                onClick={onToggleImprintPanel}
              >
                Imprint
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

ControlSidebar.displayName = "ControlSidebar"
