"use client"

import { Plus, SquarePen, Trash2 } from "lucide-react"
import { createPortal } from "react-dom"
import type { Dispatch, SetStateAction } from "react"

import { ImageEditorDialog, type ImageEditorState } from "@/components/dialogs/ImageEditorDialog"
import { TextEditorPanel } from "@/components/sidebar/TextEditorPanel"
import type { BlockEditorState } from "@/components/editor/block-editor-types"
import type { PreviewColorSchemeOption, TextEditorControls } from "@/lib/preview-overlay-controls"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { BlockRect, TextAlignMode } from "@/lib/preview-types"
import type { HelpSectionId } from "@/lib/help-registry"

type Props<StyleKey extends string> = {
  showEditorHelpIcon: boolean
  showRolloverInfo: boolean
  editorSidebarHost: HTMLDivElement | null
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
  beginDetachedCopyDrag: (key: string, clientX: number, clientY: number) => void
  deletePreviewTarget: (key: string) => void
  clearHover: () => void
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  deleteImagePlaceholder: () => void
  baselinesPerGridModule: number
  gridRows: number
  gridCols: number
  imageColorScheme: ImageColorSchemeId
  imagePalette: readonly string[]
  imageColorSchemes: readonly PreviewColorSchemeOption[]
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  isDarkMode?: boolean
}

export function GridPreviewOverlays<StyleKey extends string>({
  showEditorHelpIcon,
  showRolloverInfo,
  editorSidebarHost,
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
  beginDetachedCopyDrag,
  deletePreviewTarget,
  clearHover,
  setImageEditorState,
  deleteImagePlaceholder,
  baselinesPerGridModule,
  gridRows,
  gridCols,
  imageColorScheme,
  imagePalette,
  imageColorSchemes,
  onOpenHelpSection,
  isDarkMode = false,
}: Props<StyleKey>) {
  const activeEditorTarget = editorState?.target ?? imageEditorState?.target ?? null
  const hoveredEditTarget = hoveredTextKey && hoveredTextRect
    ? { kind: "text" as const, key: hoveredTextKey, rect: hoveredTextRect }
    : hoveredImageKey && hoveredImageRect
      ? { kind: "image" as const, key: hoveredImageKey, rect: hoveredImageRect }
      : null
  const showHoveredEditTarget = Boolean(
    hoveredEditTarget && hoveredEditTarget.key !== activeEditorTarget,
  )
  const actionButtonSize = 22
  const actionButtonGap = 4
  const editButtonInset = 6
  const actionGroupWidth = actionButtonSize * 3 + actionButtonGap * 2
  const textButtonAlign = hoveredEditTarget?.kind === "text" ? (hoveredTextAlign ?? "left") : "left"
  const actionGroupLeft = hoveredEditTarget
    ? Math.max(
      editButtonInset,
      Math.min(
        pageWidthCss - editButtonInset - actionGroupWidth,
        textButtonAlign === "right"
          ? hoveredEditTarget.rect.x + hoveredEditTarget.rect.width - actionGroupWidth - editButtonInset
          : textButtonAlign === "center"
            ? hoveredEditTarget.rect.x + hoveredEditTarget.rect.width / 2 - actionGroupWidth / 2
            : hoveredEditTarget.rect.x + editButtonInset,
      ),
    )
    : 0
  const actionGroupTop = hoveredEditTarget
    ? Math.max(
      editButtonInset,
      Math.min(
        pageHeightCss - editButtonInset - actionButtonSize,
        hoveredEditTarget.rect.y + editButtonInset,
      ),
    )
    : 0

  const editorSidebar = editorSidebarHost
    ? createPortal(
      <>
        {editorState && textEditorControls ? (
          <div
            data-editor-interactive-root="true"
            className="h-full"
            onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-editor") : undefined}
          >
            <TextEditorPanel
              showRolloverInfo={showRolloverInfo}
              showHelpIndicator={showEditorHelpIcon}
              onOpenHelpSection={onOpenHelpSection}
              controls={textEditorControls}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : null}

        {imageEditorState ? (
          <div
            data-editor-interactive-root="true"
            className="h-full"
            onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-image-editor") : undefined}
          >
            <ImageEditorDialog
              editorState={imageEditorState}
              setEditorState={setImageEditorState}
              deleteEditor={deleteImagePlaceholder}
              baselinesPerGridModule={baselinesPerGridModule}
              gridRows={gridRows}
              gridCols={gridCols}
              colorSchemes={imageColorSchemes}
              selectedColorScheme={imageColorScheme}
              palette={imagePalette}
              showHelpIndicator={showEditorHelpIcon}
              onOpenHelpSection={onOpenHelpSection}
              showRolloverInfo={showRolloverInfo}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : null}
      </>,
      editorSidebarHost,
    )
    : null

  return (
    <>
      {showHoveredEditTarget && hoveredEditTarget ? (
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
          <div
            className="pointer-events-auto absolute flex items-center"
            style={{
              left: actionGroupLeft,
              top: actionGroupTop,
              transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
            }}
          >
            <button
              type="button"
              data-preview-edit-affordance="true"
              className={`flex items-center justify-center rounded-sm border shadow-md transition-colors ${
                isDarkMode
                  ? "border-gray-700 bg-gray-900/95 text-gray-200 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-50"
                  : "border-gray-200 bg-white/95 text-gray-700 hover:border-gray-300 hover:bg-white hover:text-gray-900"
              }`}
              style={{
                width: actionButtonSize,
                height: actionButtonSize,
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
              <SquarePen className="h-3 w-3" />
            </button>
            <button
              type="button"
              data-preview-edit-affordance="true"
              className={`flex items-center justify-center rounded-sm border shadow-md transition-colors ${
                isDarkMode
                  ? "border-gray-700 bg-gray-900/95 text-gray-200 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-50"
                  : "border-gray-200 bg-white/95 text-gray-700 hover:border-gray-300 hover:bg-white hover:text-gray-900"
              }`}
              style={{
                width: actionButtonSize,
                height: actionButtonSize,
                marginLeft: actionButtonGap,
              }}
              onMouseLeave={() => clearHover()}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                beginDetachedCopyDrag(hoveredEditTarget.key, event.clientX, event.clientY)
              }}
              aria-label={`Duplicate ${hoveredEditTarget.kind === "text" ? "paragraph" : "image placeholder"}`}
              title={hoveredEditTarget.kind === "text" ? "Duplicate paragraph" : "Duplicate image placeholder"}
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              type="button"
              data-preview-edit-affordance="true"
              className={`flex items-center justify-center rounded-sm border shadow-md transition-colors ${
                isDarkMode
                  ? "border-gray-700 bg-gray-900/95 text-gray-200 hover:border-red-500/70 hover:bg-gray-800 hover:text-red-300"
                  : "border-gray-200 bg-white/95 text-gray-700 hover:border-red-300 hover:bg-white hover:text-red-600"
              }`}
              style={{
                width: actionButtonSize,
                height: actionButtonSize,
                marginLeft: actionButtonGap,
              }}
              onMouseLeave={() => clearHover()}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                deletePreviewTarget(hoveredEditTarget.key)
              }}
              aria-label={`Delete ${hoveredEditTarget.kind === "text" ? "paragraph" : "image placeholder"}`}
              title={hoveredEditTarget.kind === "text" ? "Delete paragraph" : "Delete image placeholder"}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : null}

      {editorSidebar}
    </>
  )
}
