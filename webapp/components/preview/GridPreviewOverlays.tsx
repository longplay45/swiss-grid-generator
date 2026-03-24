"use client"

import { SquarePen } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

import { ImageEditorDialog, type ImageEditorState } from "@/components/dialogs/ImageEditorDialog"
import { TextEditorPanel } from "@/components/sidebar/TextEditorPanel"
import type { BlockEditorState } from "@/components/editor/block-editor-types"
import type { PreviewColorSchemeOption, TextEditorControls } from "@/lib/preview-overlay-controls"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { BlockRect, TextAlignMode } from "@/lib/preview-types"

type PerfPayload = {
  draw: { p50: number; p95: number } | null
  reflow: { p50: number; p95: number } | null
  autofit: { p50: number; p95: number } | null
}

type Props<StyleKey extends string> = {
  showPerfOverlay: boolean
  perfOverlay: PerfPayload | null
  showEditorHelpIcon: boolean
  showRolloverInfo: boolean
  pageWidthCss: number
  pageHeightCss: number
  pageRotation: number
  editorState: BlockEditorState<StyleKey> | null
  imageEditorState: ImageEditorState | null
  textEditorControls: TextEditorControls<StyleKey> | null
  hoveredTextKey: string | null
  hoveredTextRect: BlockRect | null
  hoveredTextAlign: TextAlignMode | null
  hoveredImageKey: string | null
  hoveredImageRect: BlockRect | null
  openTextEditor: (key: string) => void
  openImageEditor: (key: string) => void
  clearHover: () => void
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  deleteImagePlaceholder: () => void
  gridRows: number
  gridCols: number
  imageColorScheme: ImageColorSchemeId
  imagePalette: readonly string[]
  rowTriggerMinWidthCh: number
  colTriggerMinWidthCh: number
  imageColorSchemes: readonly PreviewColorSchemeOption[]
  onOpenHelpSection?: (sectionId: "help-editor" | "help-image-editor") => void
}

export function GridPreviewOverlays<StyleKey extends string>({
  showPerfOverlay,
  perfOverlay,
  showEditorHelpIcon,
  showRolloverInfo,
  pageWidthCss,
  pageHeightCss,
  pageRotation,
  editorState,
  imageEditorState,
  textEditorControls,
  hoveredTextKey,
  hoveredTextRect,
  hoveredTextAlign,
  hoveredImageKey,
  hoveredImageRect,
  openTextEditor,
  openImageEditor,
  clearHover,
  setImageEditorState,
  deleteImagePlaceholder,
  gridRows,
  gridCols,
  imageColorScheme,
  imagePalette,
  rowTriggerMinWidthCh,
  colTriggerMinWidthCh,
  imageColorSchemes,
  onOpenHelpSection,
}: Props<StyleKey>) {
  const hoveredEditTarget = hoveredTextKey && hoveredTextRect
    ? { kind: "text" as const, key: hoveredTextKey, rect: hoveredTextRect }
    : hoveredImageKey && hoveredImageRect
      ? { kind: "image" as const, key: hoveredImageKey, rect: hoveredImageRect }
      : null
  const editButtonSize = 26
  const editButtonInset = 6
  const textButtonAlign = hoveredEditTarget?.kind === "text" ? (hoveredTextAlign ?? "left") : "left"
  const editButtonLeft = hoveredEditTarget
    ? Math.max(
      editButtonInset,
      Math.min(
        pageWidthCss - editButtonInset - editButtonSize,
        textButtonAlign === "right"
          ? hoveredEditTarget.rect.x + hoveredEditTarget.rect.width - editButtonSize - editButtonInset
          : textButtonAlign === "center"
            ? hoveredEditTarget.rect.x + hoveredEditTarget.rect.width / 2 - editButtonSize / 2
            : hoveredEditTarget.rect.x + editButtonInset,
      ),
    )
    : 0
  const editButtonTop = hoveredEditTarget
    ? Math.max(
      editButtonInset,
      Math.min(
        pageHeightCss - editButtonInset - editButtonSize,
        hoveredEditTarget.rect.y + editButtonInset,
      ),
    )
    : 0

  return (
    <>
      {showPerfOverlay ? (
        <div className="pointer-events-none absolute left-3 top-3 z-40 flex flex-col gap-2">
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

      {hoveredEditTarget && !editorState && !imageEditorState ? (
        <div
          className="pointer-events-none absolute z-40"
          style={{
            left: "50%",
            top: "50%",
            width: pageWidthCss,
            height: pageHeightCss,
            transform: `translate(-50%, -50%) rotate(${pageRotation}deg)`,
            transformOrigin: `${pageWidthCss / 2}px ${pageHeightCss / 2}px`,
          }}
        >
          <button
            type="button"
            data-preview-edit-affordance="true"
            className="pointer-events-auto absolute flex h-[26px] w-[26px] items-center justify-center rounded-sm border border-gray-200 bg-white/95 text-gray-700 shadow-md transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-900"
            style={{
              left: editButtonLeft,
              top: editButtonTop,
              transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
            }}
            onMouseLeave={() => clearHover()}
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              clearHover()
              if (hoveredEditTarget.kind === "text") {
                openTextEditor(hoveredEditTarget.key)
                return
              }
              openImageEditor(hoveredEditTarget.key)
            }}
            aria-label={`Edit ${hoveredEditTarget.kind === "text" ? "paragraph" : "image placeholder"}`}
            title={hoveredEditTarget.kind === "text" ? "Edit paragraph" : "Edit image placeholder"}
          >
            <SquarePen className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {editorState && textEditorControls ? (
        <div
          data-text-editor-panel="true"
          className="absolute left-3 top-3 z-40"
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
          className="absolute left-3 top-3 z-40"
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
