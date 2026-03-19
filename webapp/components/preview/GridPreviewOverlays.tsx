"use client"

import type { Dispatch, SetStateAction } from "react"

import { ImageEditorDialog, type ImageEditorState } from "@/components/dialogs/ImageEditorDialog"
import { TextEditorPanel } from "@/components/sidebar/TextEditorPanel"
import type { BlockEditorState } from "@/components/editor/block-editor-types"
import type { PreviewColorSchemeOption, TextEditorControls } from "@/lib/preview-overlay-controls"
import { PREVIEW_INTERACTION_HINT_LINES } from "@/lib/preview-interaction-hints"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"

type PerfPayload = {
  draw: { p50: number; p95: number } | null
  reflow: { p50: number; p95: number } | null
  autofit: { p50: number; p95: number } | null
}

type Props<StyleKey extends string> = {
  showInteractionHint: boolean
  showPerfOverlay: boolean
  perfOverlay: PerfPayload | null
  showEditorHelpIcon: boolean
  showRolloverInfo: boolean
  editorState: BlockEditorState<StyleKey> | null
  imageEditorState: ImageEditorState | null
  textEditorControls: TextEditorControls<StyleKey> | null
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  deleteImagePlaceholder: () => void
  gridRows: number
  gridCols: number
  imageColorScheme: ImageColorSchemeId
  handleImageColorSchemeChange: (value: ImageColorSchemeId) => void
  imagePalette: readonly string[]
  rowTriggerMinWidthCh: number
  colTriggerMinWidthCh: number
  imageColorSchemes: readonly PreviewColorSchemeOption[]
  onOpenHelpSection?: (sectionId: "help-editor" | "help-image-editor") => void
}

export function GridPreviewOverlays<StyleKey extends string>({
  showInteractionHint,
  showPerfOverlay,
  perfOverlay,
  showEditorHelpIcon,
  showRolloverInfo,
  editorState,
  imageEditorState,
  textEditorControls,
  setImageEditorState,
  deleteImagePlaceholder,
  gridRows,
  gridCols,
  imageColorScheme,
  handleImageColorSchemeChange,
  imagePalette,
  rowTriggerMinWidthCh,
  colTriggerMinWidthCh,
  imageColorSchemes,
  onOpenHelpSection,
}: Props<StyleKey>) {
  return (
    <>
      {(showInteractionHint || showPerfOverlay) ? (
        <div className="pointer-events-none absolute left-3 top-3 z-40 flex flex-col gap-2">
          {showInteractionHint ? (
            <div className="w-72 rounded-md border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
              <div className="text-[11px] font-medium text-gray-900">Interaction</div>
              {PREVIEW_INTERACTION_HINT_LINES.map((line, index) => (
                <div key={line} className={`${index === 0 ? "mt-1" : ""} text-[11px] text-gray-600`}>
                  {line}
                </div>
              ))}
            </div>
          ) : null}

          {showPerfOverlay && perfOverlay ? (
            <div className="rounded-md border border-gray-300 bg-white/95 px-3 py-2 text-[11px] text-gray-700 shadow-md backdrop-blur-sm">
              <div className="font-semibold text-gray-900">Perf (Ctrl/Cmd+Shift+P)</div>
              <div>draw p50/p95: {perfOverlay.draw?.p50.toFixed(1) ?? "-"} / {perfOverlay.draw?.p95.toFixed(1) ?? "-"} ms</div>
              <div>reflow p50/p95: {perfOverlay.reflow?.p50.toFixed(1) ?? "-"} / {perfOverlay.reflow?.p95.toFixed(1) ?? "-"} ms</div>
              <div>autofit p50/p95: {perfOverlay.autofit?.p50.toFixed(1) ?? "-"} / {perfOverlay.autofit?.p95.toFixed(1) ?? "-"} ms</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {editorState && textEditorControls ? (
        <div
          data-text-editor-panel="true"
          className={`absolute left-3 top-3 z-40 ${showEditorHelpIcon ? "rounded-md ring-1 ring-blue-500" : ""}`}
          onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-editor") : undefined}
        >
          <TextEditorPanel
            isHelpActive={showEditorHelpIcon}
            showRolloverInfo={showRolloverInfo}
            controls={textEditorControls}
          />
        </div>
      ) : null}

      {imageEditorState ? (
        <div
          data-image-editor-panel="true"
          className={`absolute left-3 top-3 z-40 ${showEditorHelpIcon ? "rounded-md ring-1 ring-blue-500" : ""}`}
          onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-image-editor") : undefined}
        >
          <ImageEditorDialog
            editorState={imageEditorState}
            setEditorState={setImageEditorState}
            deleteEditor={deleteImagePlaceholder}
            gridRows={gridRows}
            gridCols={gridCols}
            colorSchemes={imageColorSchemes}
            selectedColorScheme={imageColorScheme}
            onColorSchemeChange={handleImageColorSchemeChange}
            palette={imagePalette}
            rowTriggerMinWidthCh={rowTriggerMinWidthCh}
            colTriggerMinWidthCh={colTriggerMinWidthCh}
            isHelpActive={showEditorHelpIcon}
            showRolloverInfo={showRolloverInfo}
          />
        </div>
      ) : null}
    </>
  )
}
