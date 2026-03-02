export type SidebarPanel = "settings" | "help" | "imprint" | "example" | "text-editor" | null
export type NonEditorSidebarPanel = Exclude<SidebarPanel, "text-editor">

export type InlineEditorTransformInput = {
  pageWidth: number
  pageHeight: number
  pageRotation: number
  blockRotation: number
  rectX: number
  rectY: number
  rotationOriginX: number
  rotationOriginY: number
}

export type InlineEditorTransformOutput = {
  pageTransform: string
  pageTransformOrigin: string
  blockTransform: string
  blockTransformOrigin: string
}

export function buildInlineEditorTransform(input: InlineEditorTransformInput): InlineEditorTransformOutput {
  const pageCenterX = input.pageWidth / 2
  const pageCenterY = input.pageHeight / 2
  const relativeOriginX = input.rotationOriginX - input.rectX
  const relativeOriginY = input.rotationOriginY - input.rectY
  return {
    pageTransform: `rotate(${input.pageRotation}deg)`,
    pageTransformOrigin: `${pageCenterX}px ${pageCenterY}px`,
    blockTransform: `rotate(${input.blockRotation}deg)`,
    blockTransformOrigin: `${relativeOriginX}px ${relativeOriginY}px`,
  }
}

export function computeSidebarWithEditorSession(
  activePanel: SidebarPanel,
  previousPanelBeforeEditor: NonEditorSidebarPanel,
  hasEditorSession: boolean,
): { nextPanel: SidebarPanel; nextPreviousPanelBeforeEditor: NonEditorSidebarPanel } {
  if (hasEditorSession) {
    if (activePanel === "text-editor") {
      return { nextPanel: activePanel, nextPreviousPanelBeforeEditor: previousPanelBeforeEditor }
    }
    return {
      nextPanel: "text-editor",
      nextPreviousPanelBeforeEditor: activePanel,
    }
  }
  if (activePanel !== "text-editor") {
    return { nextPanel: activePanel, nextPreviousPanelBeforeEditor: previousPanelBeforeEditor }
  }
  return {
    nextPanel: previousPanelBeforeEditor,
    nextPreviousPanelBeforeEditor: previousPanelBeforeEditor,
  }
}
