"use client"

import type { ReactNode } from "react"

type UiTheme = {
  leftPanel: string
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
  onToggleFeedbackPanel: () => void
  onToggleImprintPanel: () => void
}

export function ControlSidebar({
  showPresetsBrowser,
  showBetaBadge,
  appVersion,
  uiTheme,
  settingsPanels,
  onToggleFeedbackPanel,
  onToggleImprintPanel,
}: Props) {
  return (
    <div className={`w-full md:w-[280px] flex max-h-[50vh] flex-col border-r border-b md:max-h-full md:border-b-0 ${uiTheme.leftPanel}`}>
      <div className={`shrink-0 space-y-2 border-b p-4 md:px-6 md:pt-6 ${uiTheme.subtleBorder}`}>
        <h1 className="text-3xl leading-[1] xfont-bold tracking-tight">Swiss Grid Generator</h1>
        <p className={`text-sm ${uiTheme.bodyText}`}>
          Based on Müller-Brockmann&apos;s <em><a href="https://amzn.to/40kfiUL">Grid Systems in Graphic Design</a></em> (1981).
          Copyleft &amp; -right 2026 by{" "}
          <a href="https://lp45.net" className={uiTheme.link}>lp45.net</a>.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className={`relative min-h-0 flex-1 ${showPresetsBrowser ? "opacity-50" : ""}`}>
          {showPresetsBrowser ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10 cursor-not-allowed"
            />
          ) : null}

          {settingsPanels}
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
}
