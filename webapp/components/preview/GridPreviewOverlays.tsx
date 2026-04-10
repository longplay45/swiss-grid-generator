"use client"

import { SquarePen } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

import { ImageEditorDialog, type ImageEditorState } from "@/components/dialogs/ImageEditorDialog"
import { TextEditorPanel } from "@/components/sidebar/TextEditorPanel"
import type { BlockEditorState } from "@/components/editor/block-editor-types"
import type { PreviewColorSchemeOption, TextEditorControls } from "@/lib/preview-overlay-controls"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { BlockRect, TextAlignMode } from "@/lib/preview-types"

type Props<StyleKey extends string> = {
  showEditorHelpIcon: boolean
  showRolloverInfo: boolean
  previewWidthCss: number
  pageWidthCss: number
  pageHeightCss: number
  pageRotation: number
  editorState: BlockEditorState<StyleKey> | null
  imageEditorState: ImageEditorState | null
  textEditorControls: TextEditorControls<StyleKey> | null
  activeTextEditorRect: BlockRect | null
  activeImageEditorRect: BlockRect | null
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
  isDarkMode?: boolean
}

export function GridPreviewOverlays<StyleKey extends string>({
  showEditorHelpIcon,
  showRolloverInfo,
  previewWidthCss,
  pageWidthCss,
  pageHeightCss,
  pageRotation,
  editorState,
  imageEditorState,
  textEditorControls,
  activeTextEditorRect,
  activeImageEditorRect,
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
  isDarkMode = false,
}: Props<StyleKey>) {
  const PREVIEW_EDITOR_INSET_PX = 12
  const PREVIEW_EDITOR_RAIL_WIDTH_PX = 40
  const PREVIEW_EDITOR_SUBMENU_GAP_PX = 8
  const PREVIEW_EDITOR_SUBMENU_WIDTH_PX = 304
  const PREVIEW_EDITOR_LEFT_DOCK_REQUIRED_WIDTH_PX = (
    PREVIEW_EDITOR_INSET_PX
    + PREVIEW_EDITOR_RAIL_WIDTH_PX
    + PREVIEW_EDITOR_SUBMENU_GAP_PX
    + PREVIEW_EDITOR_SUBMENU_WIDTH_PX
  )
  const hoveredEditTarget = hoveredTextKey && hoveredTextRect
    ? { kind: "text" as const, key: hoveredTextKey, rect: hoveredTextRect }
      : hoveredImageKey && hoveredImageRect
      ? { kind: "image" as const, key: hoveredImageKey, rect: hoveredImageRect }
      : null
  const resolveEditorDockSide = (rect: BlockRect | null): "left" | "right" => {
    const leftDocumentGutterPx = Math.max(0, (previewWidthCss - pageWidthCss) / 2)
    if (leftDocumentGutterPx >= PREVIEW_EDITOR_LEFT_DOCK_REQUIRED_WIDTH_PX) {
      return "left"
    }
    if (!rect) return "left"
    const rectCenterY = rect.y + rect.height / 2
    if (rectCenterY >= pageHeightCss / 2) {
      return "left"
    }
    const rectCenterX = rect.x + rect.width / 2
    return rectCenterX < pageWidthCss / 2 ? "right" : "left"
  }
  const getDockStyle = (dockSide: "left" | "right") => (
    dockSide === "left"
      ? { left: PREVIEW_EDITOR_INSET_PX }
      : { right: PREVIEW_EDITOR_INSET_PX }
  )
  const textEditorDockSide = resolveEditorDockSide(activeTextEditorRect)
  const imageEditorDockSide = resolveEditorDockSide(activeImageEditorRect)
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
            className={`pointer-events-auto absolute flex h-[26px] w-[26px] items-center justify-center rounded-sm border shadow-md transition-colors ${
              isDarkMode
                ? "border-gray-700 bg-gray-900/95 text-gray-200 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-50"
                : "border-gray-200 bg-white/95 text-gray-700 hover:border-gray-300 hover:bg-white hover:text-gray-900"
            }`}
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
          className="absolute top-3 z-40"
          style={getDockStyle(textEditorDockSide)}
          onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-editor") : undefined}
        >
          <TextEditorPanel
            isHelpActive={showEditorHelpIcon}
            showRolloverInfo={showRolloverInfo}
            controls={textEditorControls}
            isDarkMode={isDarkMode}
            dockSide={textEditorDockSide}
          />
        </div>
      ) : null}

      {imageEditorState ? (
        <div
          data-image-editor-panel="true"
          className="absolute top-3 z-40"
          style={getDockStyle(imageEditorDockSide)}
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
            isDarkMode={isDarkMode}
            dockSide={imageEditorDockSide}
          />
        </div>
      ) : null}
    </>
  )
}
