import { strToU8, zipSync } from "fflate"
import { parseHexColor, type RgbColor } from "@/lib/export-colors"
import { loadOutlineFont, type OpenTypePathCommand } from "@/lib/font-outline"
import { mmToPt } from "@/lib/units"
import { resolveIdmlFontMetadata } from "@/lib/idml/font-metadata"
import type { IdmlFontMetadata, SwissGridIdmlDocument } from "@/lib/idml/types"
import { escapeIdmlXml, formatIdmlNumber, renderIdmlElement } from "@/lib/idml/xml"

type Matrix = readonly [number, number, number, number, number, number]
type Point = { x: number; y: number }

type ColorSwatch = {
  id: string
  name: string
  color: RgbColor
}

type CharacterStyleRecord = {
  id: string
  name: string
  font: IdmlFontMetadata
  pointSize: number
  leading: number
  tracking: number
  fillColorId: string
}

type StoryExportRecord = {
  id: string
  filePath: string
  xml: string
}

type SpreadExportRecord = {
  filePath: string
  xml: string
  pageId: string
}

type IdmlPathPoint = {
  anchor: Point
  left: Point
  right: Point
}

type IdmlGeometryPath = {
  open: boolean
  points: IdmlPathPoint[]
}

const IDML_MIMETYPE = "application/vnd.adobe.indesign-idml-package"

const DOCUMENT_ID = "d"
const BACKING_STORY_ID = "sggBackingStory"
const MASTER_SPREAD_ID = "sggMaster"
const MASTER_PAGE_ID = "sggMasterPage"
const LAYER_PLACEHOLDERS_ID = "sggLayerPlaceholders"
const LAYER_TYPOGRAPHY_ID = "sggLayerTypography"
const LAYER_GUIDES_ID = "sggLayerGuides"
const SWATCH_NONE_ID = "Swatch/None"
const COLOR_BLACK_ID = "Color/Black"
const COLOR_PAPER_ID = "Color/Paper"

const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0]

function isIdentityMatrix(matrix: Matrix): boolean {
  return matrix.every((value, index) => Math.abs(value - IDENTITY_MATRIX[index]) <= 0.000001)
}

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  const [a1, b1, c1, d1, tx1, ty1] = left
  const [a2, b2, c2, d2, tx2, ty2] = right
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * tx2 + c1 * ty2 + tx1,
    b1 * tx2 + d1 * ty2 + ty1,
  ]
}

function buildRotationMatrix(angle: number, originX: number, originY: number): Matrix {
  if (Math.abs(angle) <= 0.000001) return IDENTITY_MATRIX
  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    cos,
    sin,
    -sin,
    cos,
    originX - originX * cos + originY * sin,
    originY - originX * sin - originY * cos,
  ]
}

function formatMatrix(matrix: Matrix): string {
  return matrix.map((value) => formatIdmlNumber(value)).join(" ")
}

function formatPoint(x: number, y: number): string {
  return `${formatIdmlNumber(x)} ${formatIdmlNumber(y)}`
}

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y }
}

function buildStraightPathPoint(point: Point): IdmlPathPoint {
  return {
    anchor: clonePoint(point),
    left: clonePoint(point),
    right: clonePoint(point),
  }
}

function pointsEqual(left: Point, right: Point): boolean {
  return Math.abs(left.x - right.x) <= 0.0001 && Math.abs(left.y - right.y) <= 0.0001
}

function buildPageCoordinateTransform(pageHeight: number): Matrix {
  return [1, 0, 0, 1, 0, -pageHeight / 2]
}

function buildPageItemTransform(pageWidth: number, pageHeight: number, pageRotation: number): Matrix {
  const pageCoordinateTransform = buildPageCoordinateTransform(pageHeight)
  if (Math.abs(pageRotation) <= 0.000001) return pageCoordinateTransform
  const pageRotationTransform = buildRotationMatrix(pageRotation, pageWidth / 2, pageHeight / 2)
  return multiplyMatrices(pageCoordinateTransform, pageRotationTransform)
}

function renderPathGeometry(paths: IdmlGeometryPath[]): string {
  return renderIdmlElement(
    "Properties",
    {},
    renderIdmlElement(
      "PathGeometry",
      {},
      paths.map((path) => renderIdmlElement(
        "GeometryPathType",
        {
          GeometryPathType: "NormalPath",
          PathOpen: path.open,
        },
        renderIdmlElement(
          "PathPointArray",
          {},
          path.points.map((point) => renderIdmlElement("PathPointType", {
            Anchor: formatPoint(point.anchor.x, point.anchor.y),
            LeftDirection: formatPoint(point.left.x, point.left.y),
            RightDirection: formatPoint(point.right.x, point.right.y),
          })),
        ),
      )),
    ),
  )
}

function renderRectPathGeometry(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  return renderPathGeometry([{
    open: false,
    points: [
      buildStraightPathPoint({ x, y }),
      buildStraightPathPoint({ x: x + width, y }),
      buildStraightPathPoint({ x: x + width, y: y + height }),
      buildStraightPathPoint({ x, y: y + height }),
    ],
  }])
}

function isRenderableTextFragment(text: string): boolean {
  return text.replace(/\s+/g, "").length > 0
}

function quadraticToCubic(start: Point, control: Point, end: Point): { control1: Point; control2: Point } {
  return {
    control1: {
      x: start.x + ((control.x - start.x) * 2) / 3,
      y: start.y + ((control.y - start.y) * 2) / 3,
    },
    control2: {
      x: end.x + ((control.x - end.x) * 2) / 3,
      y: end.y + ((control.y - end.y) * 2) / 3,
    },
  }
}

function convertOpenTypeCommandsToGeometryPaths(commands: readonly OpenTypePathCommand[]): IdmlGeometryPath[] {
  const paths: IdmlGeometryPath[] = []
  let current: IdmlPathPoint[] = []

  const finalizeCurrent = (open: boolean) => {
    if (current.length === 0) return
    if (!open && current.length > 1) {
      const first = current[0]!
      const last = current[current.length - 1]!
      if (pointsEqual(first.anchor, last.anchor)) {
        first.left = clonePoint(last.left)
        current = current.slice(0, -1)
      }
    }
    if (current.length > 0) {
      paths.push({ open, points: current })
    }
    current = []
  }

  for (const command of commands) {
    switch (command.type) {
      case "M": {
        finalizeCurrent(true)
        current = [buildStraightPathPoint({ x: command.x, y: command.y })]
        break
      }
      case "L": {
        if (current.length === 0) break
        const lastPoint = current[current.length - 1]!
        const nextPoint = buildStraightPathPoint({ x: command.x, y: command.y })
        lastPoint.right = clonePoint(lastPoint.anchor)
        current.push(nextPoint)
        break
      }
      case "C": {
        if (current.length === 0) break
        const lastPoint = current[current.length - 1]!
        lastPoint.right = { x: command.x1, y: command.y1 }
        current.push({
          anchor: { x: command.x, y: command.y },
          left: { x: command.x2, y: command.y2 },
          right: { x: command.x, y: command.y },
        })
        break
      }
      case "Q": {
        if (current.length === 0) break
        const lastPoint = current[current.length - 1]!
        const cubic = quadraticToCubic(
          lastPoint.anchor,
          { x: command.x1, y: command.y1 },
          { x: command.x, y: command.y },
        )
        lastPoint.right = cubic.control1
        current.push({
          anchor: { x: command.x, y: command.y },
          left: cubic.control2,
          right: { x: command.x, y: command.y },
        })
        break
      }
      case "Z": {
        finalizeCurrent(false)
        break
      }
      default:
        break
    }
  }

  finalizeCurrent(true)
  return paths.filter((path) => path.points.length > 0)
}

function buildColorId(color: RgbColor): string {
  return `Color/sgg-r${String(color.r).padStart(3, "0")}g${String(color.g).padStart(3, "0")}b${String(color.b).padStart(3, "0")}`
}

function buildColorName(color: RgbColor): string {
  return `SGG RGB ${String(color.r).padStart(3, "0")} ${String(color.g).padStart(3, "0")} ${String(color.b).padStart(3, "0")}`
}

function createDocumentUuid(prefix: "xmp.did" | "xmp.iid", seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) >>> 0
  }
  const hex = hash.toString(16).padStart(8, "0")
  return `${prefix}:${hex}-0000-4000-8000-${hex}${hex.slice(0, 4)}`
}

function buildColorSwatches(document: SwissGridIdmlDocument): ColorSwatch[] {
  const swatches = new Map<string, ColorSwatch>()
  const register = (color: RgbColor | null | undefined) => {
    if (!color) return
    const signature = `${color.r},${color.g},${color.b}`
    if (signature === "0,0,0") return
    if (signature === "255,255,255") return
    if (swatches.has(signature)) return
    swatches.set(signature, {
      id: buildColorId(color),
      name: buildColorName(color),
      color,
    })
  }

  for (const page of document.pages) {
    register(page.exportPlan.backgroundColor)
    for (const guideGroup of page.exportPlan.guideGroups) register(guideGroup.strokeColor)
    for (const imagePlan of page.exportPlan.imagePlans) register(imagePlan.fillColor)
    for (const textPlan of page.exportPlan.textPlans) register(textPlan.textColor)
    for (const textPlan of page.exportPlan.textPlans) {
      for (const segments of textPlan.segmentLines) {
        for (const segment of segments) {
          register(parseHexColor(segment.color))
        }
      }
    }
  }

  return [...swatches.values()]
}

async function buildFontCatalog(document: SwissGridIdmlDocument): Promise<Map<string, IdmlFontMetadata>> {
  const requested = new Map<string, Promise<IdmlFontMetadata>>()
  for (const page of document.pages) {
    for (const textPlan of page.exportPlan.textPlans) {
      const signature = `${textPlan.fontFamily}:${textPlan.fontWeight}:${textPlan.italic ? "italic" : "normal"}`
      if (requested.has(signature)) continue
      requested.set(
        signature,
        resolveIdmlFontMetadata(textPlan.fontFamily, textPlan.fontWeight, textPlan.italic),
      )
      for (const segments of textPlan.segmentLines) {
        for (const segment of segments) {
          const segmentSignature = `${segment.fontFamily}:${segment.fontWeight}:${segment.italic ? "italic" : "normal"}`
          if (requested.has(segmentSignature)) continue
          requested.set(
            segmentSignature,
            resolveIdmlFontMetadata(segment.fontFamily, segment.fontWeight, segment.italic),
          )
        }
      }
    }
  }

  const catalog = new Map<string, IdmlFontMetadata>()
  for (const [signature, task] of requested) {
    catalog.set(signature, await task)
  }
  return catalog
}

async function buildCharacterStyles(
  document: SwissGridIdmlDocument,
  colorIdBySignature: Map<string, string>,
  fontCatalog: Map<string, IdmlFontMetadata>,
): Promise<{
  styles: CharacterStyleRecord[]
  styleIdBySignature: Map<string, string>
}> {
  const styleIdBySignature = new Map<string, string>()
  const stylesBySignature = new Map<string, CharacterStyleRecord>()
  const styles: CharacterStyleRecord[] = []
  let sequence = 0

  for (const page of document.pages) {
    for (const textPlan of page.exportPlan.textPlans) {
      if (textPlan.commands.length === 0) continue
      const fontSignature = `${textPlan.fontFamily}:${textPlan.fontWeight}:${textPlan.italic ? "italic" : "normal"}`
      const font = fontCatalog.get(fontSignature)
      if (!font) continue
      const colorSignature = `${textPlan.textColor.r},${textPlan.textColor.g},${textPlan.textColor.b}`
      const fillColorId = colorIdBySignature.get(colorSignature) ?? COLOR_BLACK_ID
      const registerCharacterStyle = (
        segmentFont: IdmlFontMetadata,
        pointSize: number,
        trackingScale: number,
        segmentFillColorId: string,
      ) => {
        const styleSignature = [
          segmentFont.postScriptName,
          formatIdmlNumber(pointSize),
          formatIdmlNumber(textPlan.leading),
          formatIdmlNumber(trackingScale),
          segmentFillColorId,
        ].join("|")

        let style = stylesBySignature.get(styleSignature)
        if (!style) {
          sequence += 1
          style = {
            id: `CharacterStyle/sgg/char_${String(sequence).padStart(3, "0")}`,
            name: `SGG Character ${String(sequence).padStart(3, "0")}`,
            font: segmentFont,
            pointSize,
            leading: textPlan.leading,
            tracking: trackingScale,
            fillColorId: segmentFillColorId,
          }
          stylesBySignature.set(styleSignature, style)
          styles.push(style)
        }

        styleIdBySignature.set(styleSignature, style.id)
      }

      registerCharacterStyle(font, textPlan.fontSize, textPlan.trackingScale, fillColorId)
      for (const segments of textPlan.segmentLines) {
        for (const segment of segments) {
          const segmentFontSignature = `${segment.fontFamily}:${segment.fontWeight}:${segment.italic ? "italic" : "normal"}`
          const segmentFont = fontCatalog.get(segmentFontSignature)
          if (!segmentFont) continue
          const segmentColor = parseHexColor(segment.color) ?? textPlan.textColor
          const segmentColorSignature = `${segmentColor.r},${segmentColor.g},${segmentColor.b}`
          const segmentFillColorId = colorIdBySignature.get(segmentColorSignature) ?? COLOR_BLACK_ID
          registerCharacterStyle(segmentFont, segment.fontSize, segment.trackingScale, segmentFillColorId)
        }
      }
    }
  }

  return { styles, styleIdBySignature }
}

function buildParagraphStyleKeys(document: SwissGridIdmlDocument): string[] {
  const required = ["body", "headline", "display", "fx", "caption"]
  const used = new Set<string>(required)
  for (const page of document.pages) {
    for (const textPlan of page.exportPlan.textPlans) {
      used.add(String(textPlan.styleKey))
    }
  }
  const ordered = required.filter((key) => used.has(key))
  for (const key of [...used]) {
    if (!ordered.includes(key)) ordered.push(key)
  }
  return ordered
}

function buildParagraphStyleId(styleKey: string): string {
  return `ParagraphStyle/sgg/${styleKey.replace(/[^A-Za-z0-9_-]/g, "_")}`
}

function buildGuidesXml(
  pageTransformMatrix: Matrix,
  rects: Array<{
    key: string
    x: number
    y: number
    width: number
    height: number
    fillColorId?: string
    strokeColorId?: string
    strokeWeight?: number
    layerId: string
    name: string
  }>,
): string[] {
  return rects.map((rect, index) => renderIdmlElement(
    "Rectangle",
    {
      Self: `${rect.key}_${index + 1}`,
      Name: rect.name,
      ItemLayer: rect.layerId,
      ItemTransform: isIdentityMatrix(pageTransformMatrix) ? undefined : formatMatrix(pageTransformMatrix),
      Visible: true,
      FillColor: rect.fillColorId ?? SWATCH_NONE_ID,
      StrokeColor: rect.strokeColorId ?? SWATCH_NONE_ID,
      StrokeWeight: rect.strokeWeight !== undefined ? formatIdmlNumber(rect.strokeWeight) : 0,
    },
    renderRectPathGeometry(rect.x, rect.y, rect.width, rect.height),
  ))
}

async function buildSpreadAndStories(
  document: SwissGridIdmlDocument,
  colorIdBySignature: Map<string, string>,
): Promise<{
  spreads: SpreadExportRecord[]
  stories: StoryExportRecord[]
}> {
  const spreads: SpreadExportRecord[] = []
  const stories: StoryExportRecord[] = []

  for (const [pageIndex, page] of document.pages.entries()) {
    const spreadId = `sggSpread${String(pageIndex + 1).padStart(3, "0")}`
    const pageId = `sggPage${String(pageIndex + 1).padStart(3, "0")}`
    const pageWidth = page.exportPlan.pageWidth
    const pageHeight = page.exportPlan.pageHeight
    const marginPreference = page.result.grid.margins
    const contentWidth = Math.max(0, pageWidth - marginPreference.left - marginPreference.right)
    const pageTransformMatrix = buildPageItemTransform(pageWidth, pageHeight, page.exportPlan.rotation)
    const guideItems: string[] = []
    const placeholderItems: string[] = []
    const textItems: string[] = []
    let localItemSequence = 0

    if (page.exportPlan.backgroundColor) {
      const signature = `${page.exportPlan.backgroundColor.r},${page.exportPlan.backgroundColor.g},${page.exportPlan.backgroundColor.b}`
      placeholderItems.push(
        renderIdmlElement(
          "Rectangle",
          {
            Self: `sggBackground${String(pageIndex + 1).padStart(3, "0")}`,
            Name: "Canvas Background",
            ItemLayer: LAYER_PLACEHOLDERS_ID,
            ItemTransform: isIdentityMatrix(pageTransformMatrix) ? undefined : formatMatrix(pageTransformMatrix),
            Visible: true,
            FillColor: colorIdBySignature.get(signature) ?? COLOR_PAPER_ID,
            StrokeColor: SWATCH_NONE_ID,
            StrokeWeight: 0,
          },
          renderRectPathGeometry(0, 0, pageWidth, pageHeight),
        ),
      )
    }

    for (const imagePlan of page.exportPlan.imagePlans) {
      localItemSequence += 1
      const signature = `${imagePlan.fillColor.r},${imagePlan.fillColor.g},${imagePlan.fillColor.b}`
      const fillTint = Math.max(0, Math.min(100, Math.round(imagePlan.opacity * 100)))
      const imageTransform = multiplyMatrices(
        pageTransformMatrix,
        buildRotationMatrix(imagePlan.rotation, imagePlan.rotationOriginX, imagePlan.rotationOriginY),
      )
      placeholderItems.push(
        renderIdmlElement(
          "Rectangle",
          {
            Self: `sggPlaceholder_${pageIndex + 1}_${localItemSequence}`,
            Name: `Placeholder ${imagePlan.key}`,
            ItemLayer: LAYER_PLACEHOLDERS_ID,
            ItemTransform: isIdentityMatrix(imageTransform) ? undefined : formatMatrix(imageTransform),
            Visible: true,
            FillColor: colorIdBySignature.get(signature) ?? COLOR_BLACK_ID,
            FillTint: fillTint,
            StrokeColor: SWATCH_NONE_ID,
            StrokeWeight: 0,
          },
          renderRectPathGeometry(imagePlan.x, imagePlan.y, imagePlan.width, imagePlan.height),
        ),
      )
    }

    for (const guideGroup of page.exportPlan.guideGroups) {
      const guideColorSignature = `${guideGroup.strokeColor.r},${guideGroup.strokeColor.g},${guideGroup.strokeColor.b}`
      const guideColorId = colorIdBySignature.get(guideColorSignature) ?? COLOR_BLACK_ID
      const guideRects = guideGroup.rects.map((rect, rectIndex) => ({
        key: `sggGuideRect_${pageIndex + 1}_${guideGroup.id}_${rectIndex + 1}`,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        strokeColorId: guideColorId,
        strokeWeight: guideGroup.strokeWidth,
        layerId: LAYER_GUIDES_ID,
        name: `${guideGroup.id} ${rectIndex + 1}`,
      }))
      guideItems.push(...buildGuidesXml(pageTransformMatrix, guideRects))

      if (guideGroup.lines.length > 0) {
        const baselineRects = guideGroup.lines
          .map((line, lineIndex) => {
            const left = guideGroup.clipToPage ? Math.max(0, Math.min(line.x1, line.x2)) : Math.min(line.x1, line.x2)
            const right = guideGroup.clipToPage ? Math.min(pageWidth, Math.max(line.x1, line.x2)) : Math.max(line.x1, line.x2)
            const top = line.y1 - guideGroup.strokeWidth / 2
            const height = Math.max(guideGroup.strokeWidth, 0.25)
            const width = right - left
            if (!(width > 0)) return null
            if (guideGroup.clipToPage && (top > pageHeight || top + height < 0)) return null
            return {
              key: `sggGuideLine_${pageIndex + 1}_${guideGroup.id}_${lineIndex + 1}`,
              x: left,
              y: top,
              width,
              height,
              fillColorId: guideColorId,
              layerId: LAYER_GUIDES_ID,
              name: `${guideGroup.id} line ${lineIndex + 1}`,
            }
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        guideItems.push(...buildGuidesXml(pageTransformMatrix, baselineRects))
      }
    }

    for (const textPlan of page.exportPlan.textPlans) {
      if (textPlan.graphemeLines.length === 0) continue
      const blockRotationMatrix = buildRotationMatrix(
        textPlan.blockRotation,
        textPlan.rotationOriginX,
        textPlan.rotationOriginY,
      )
      const itemMatrix = multiplyMatrices(pageTransformMatrix, blockRotationMatrix)
      const outlinedGraphemeTasks: Array<Promise<string | null>> = []

      for (const [lineIndex, graphemeLine] of textPlan.graphemeLines.entries()) {
        for (const [graphemeIndex, grapheme] of graphemeLine.entries()) {
          if (!isRenderableTextFragment(grapheme.text)) continue
          localItemSequence += 1
          const itemId = `sggGlyph_${String(pageIndex + 1).padStart(3, "0")}_${String(localItemSequence).padStart(4, "0")}`
          const itemName = `${page.name} / ${textPlan.key} / glyph ${lineIndex + 1}.${graphemeIndex + 1}`
          outlinedGraphemeTasks.push((async () => {
            const font = await loadOutlineFont(grapheme.fontFamily, grapheme.fontWeight, grapheme.italic)
            if (!font) {
              throw new Error(`Unable to resolve outline font for IDML export: ${grapheme.fontFamily} ${grapheme.fontWeight}${grapheme.italic ? " italic" : ""}`)
            }

            const geometryPaths = convertOpenTypeCommandsToGeometryPaths(
              font.getPath(
                grapheme.text,
                grapheme.x,
                grapheme.y,
                grapheme.fontSize,
                {
                  kerning: false,
                  hinting: false,
                },
              ).commands,
            )
            if (geometryPaths.length === 0) return null

            const graphemeColor = parseHexColor(grapheme.color) ?? textPlan.textColor
            const colorSignature = `${graphemeColor.r},${graphemeColor.g},${graphemeColor.b}`
            return renderIdmlElement(
              "Polygon",
              {
                Self: itemId,
                Name: itemName,
                ItemLayer: LAYER_TYPOGRAPHY_ID,
                ItemTransform: isIdentityMatrix(itemMatrix) ? undefined : formatMatrix(itemMatrix),
                Visible: true,
                FillColor: colorIdBySignature.get(colorSignature) ?? COLOR_BLACK_ID,
                StrokeColor: SWATCH_NONE_ID,
                StrokeWeight: 0,
              },
              renderPathGeometry(geometryPaths),
            )
          })())
        }
      }

      textItems.push(...(await Promise.all(outlinedGraphemeTasks)).filter((item): item is string => item !== null))
    }

    spreads.push({
      filePath: `Spreads/Spread_${String(pageIndex + 1).padStart(3, "0")}.xml`,
      pageId,
      xml: [
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
        `<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
        renderIdmlElement(
          "Spread",
          {
            Self: spreadId,
            Hidden: false,
            ItemTransform: formatMatrix(IDENTITY_MATRIX),
          },
          [
            renderIdmlElement("FlattenerPreference", {
              LineArtAndTextResolution: 300,
              GradientAndMeshResolution: 150,
              ClipComplexRegions: false,
              ConvertAllStrokesToOutlines: false,
              ConvertAllTextToOutlines: false,
            }, renderIdmlElement("Properties", {}, renderIdmlElement("RasterVectorBalance", { type: "double" }, "50"))),
            renderIdmlElement(
              "Page",
              {
                Self: pageId,
                TabOrder: "",
                AppliedMaster: "n",
                OverrideList: "",
                MasterPageTransform: formatMatrix(IDENTITY_MATRIX),
                Name: String(pageIndex + 1),
                AppliedTrapPreset: "TrapPreset/$ID/kDefaultTrapStyleName",
                GeometricBounds: `0 0 ${formatIdmlNumber(pageHeight)} ${formatIdmlNumber(pageWidth)}`,
                ItemTransform: formatMatrix(buildPageCoordinateTransform(pageHeight)),
                AppliedAlternateLayout: "n",
                LayoutRule: "Off",
                SnapshotBlendingMode: "IgnoreLayoutSnapshots",
                OptionalPage: false,
                GridStartingPoint: "TopOutside",
                UseMasterGrid: true,
              },
              [
                renderIdmlElement(
                  "Properties",
                  {},
                  renderIdmlElement("PageColor", { type: "enumeration" }, "UseMasterColor"),
                ),
                renderIdmlElement("MarginPreference", {
                  ColumnCount: 1,
                  ColumnGutter: formatIdmlNumber(page.result.grid.gridMarginHorizontal),
                  Top: formatIdmlNumber(marginPreference.top),
                  Bottom: formatIdmlNumber(marginPreference.bottom),
                  Left: formatIdmlNumber(marginPreference.left),
                  Right: formatIdmlNumber(marginPreference.right),
                  ColumnDirection: "Horizontal",
                  ColumnsPositions: `0 ${formatIdmlNumber(contentWidth)}`,
                }),
                renderIdmlElement(
                  "GridDataInformation",
                  {
                    FontStyle: "Regular",
                    PointSize: formatIdmlNumber(page.result.grid.gridUnit),
                    CharacterAki: 0,
                    LineAki: formatIdmlNumber(Math.max(0, page.result.grid.gridUnit * 0.75)),
                    HorizontalScale: 100,
                    VerticalScale: 100,
                    LineAlignment: "LeftOrTopLineJustify",
                    GridAlignment: "AlignEmCenter",
                    CharacterAlignment: "AlignEmCenter",
                  },
                  renderIdmlElement(
                    "Properties",
                    {},
                    renderIdmlElement("AppliedFont", { type: "string" }, page.baseFont),
                  ),
                ),
              ],
            ),
            ...placeholderItems,
            ...textItems,
            ...guideItems,
          ],
        ),
        `</idPkg:Spread>`,
      ].join(""),
    })
  }

  return { spreads, stories }
}

function buildGraphicXml(customSwatches: ColorSwatch[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement("Color", {
      Self: COLOR_BLACK_ID,
      Model: "Process",
      Space: "RGB",
      ColorValue: "0 0 0",
      ColorOverride: "Specialblack",
      ConvertToHsb: false,
      AlternateSpace: "NoAlternateColor",
      AlternateColorValue: "",
      Name: "Black",
      ColorEditable: false,
      ColorRemovable: false,
      Visible: true,
      SwatchCreatorID: 7937,
    }),
    renderIdmlElement("Color", {
      Self: COLOR_PAPER_ID,
      Model: "Process",
      Space: "CMYK",
      ColorValue: "0 0 0 0",
      ColorOverride: "Specialpaper",
      ConvertToHsb: false,
      AlternateSpace: "NoAlternateColor",
      AlternateColorValue: "",
      Name: "Paper",
      ColorEditable: true,
      ColorRemovable: false,
      Visible: true,
      SwatchCreatorID: 7937,
    }),
    renderIdmlElement("Swatch", {
      Self: SWATCH_NONE_ID,
      Name: "None",
      ColorEditable: false,
      ColorRemovable: false,
      Visible: true,
      SwatchCreatorID: 7937,
    }),
    ...customSwatches.map((swatch) => renderIdmlElement("Color", {
      Self: swatch.id,
      Model: "Process",
      Space: "RGB",
      ColorValue: `${swatch.color.r} ${swatch.color.g} ${swatch.color.b}`,
      ColorOverride: "Normal",
      ConvertToHsb: false,
      AlternateSpace: "NoAlternateColor",
      AlternateColorValue: "",
      Name: swatch.name,
      ColorEditable: true,
      ColorRemovable: true,
      Visible: true,
      SwatchCreatorID: 7937,
    })),
    renderIdmlElement("StrokeStyle", {
      Self: "StrokeStyle/$ID/Solid",
      Name: "$ID/Solid",
    }),
    `</idPkg:Graphic>`,
  ].join("")
}

function buildFontsXml(fonts: IdmlFontMetadata[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    ...fonts.map((font, index) => (
      renderIdmlElement(
        "FontFamily",
        {
          Self: `sggFontFamily${String(index + 1).padStart(3, "0")}`,
          Name: font.family,
        },
        renderIdmlElement("Font", {
          Self: `sggFont${String(index + 1).padStart(3, "0")}`,
          FontFamily: font.family,
          Name: `${font.family} ${font.styleName}`.trim(),
          PostScriptName: font.postScriptName,
          Status: "Installed",
          FontStyleName: font.styleName,
          FontType: font.fontType,
          WritingScript: 0,
          FullName: font.fullName,
          FullNameNative: font.fullName,
          FontStyleNameNative: font.styleName,
          PlatformName: "$ID/",
          Version: "",
          TypekitID: "$ID/",
        }),
      )
    )),
    `</idPkg:Fonts>`,
  ].join("")
}

function buildStylesXml(
  paragraphStyleKeys: string[],
  characterStyles: CharacterStyleRecord[],
  baseFontFamily: string,
): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement(
      "RootCharacterStyleGroup",
      { Self: "sggCharacterRoot" },
      [
        renderIdmlElement("CharacterStyle", {
          Self: "CharacterStyle/$ID/[No character style]",
          Imported: false,
          SplitDocument: false,
          EmitCss: true,
          IncludeClass: true,
          ExtendedKeyboardShortcut: "0 0 0",
          Name: "$ID/[No character style]",
        }),
        ...characterStyles.map((style) => renderIdmlElement(
          "CharacterStyle",
          {
            Self: style.id,
            Name: style.name,
            Imported: false,
            SplitDocument: false,
            EmitCss: true,
            IncludeClass: true,
            FontStyle: style.font.styleName,
            PointSize: formatIdmlNumber(style.pointSize),
            Tracking: formatIdmlNumber(style.tracking),
            FillColor: style.fillColorId,
            StrokeColor: SWATCH_NONE_ID,
          },
          renderIdmlElement("Properties", {}, [
            renderIdmlElement("BasedOn", { type: "string" }, "$ID/[No character style]"),
            renderIdmlElement("AppliedFont", { type: "string" }, style.font.family),
            renderIdmlElement("Leading", { type: "unit" }, formatIdmlNumber(style.leading)),
            renderIdmlElement("PreviewColor", { type: "enumeration" }, "Nothing"),
          ]),
        )),
      ],
    ),
    renderIdmlElement(
      "RootParagraphStyleGroup",
      { Self: "sggParagraphRoot" },
      [
        renderIdmlElement(
          "ParagraphStyle",
          {
            Self: "ParagraphStyle/$ID/[No paragraph style]",
            Name: "$ID/[No paragraph style]",
            Imported: false,
            SplitDocument: false,
            EmitCss: true,
            IncludeClass: true,
            FillColor: COLOR_BLACK_ID,
            FontStyle: "Regular",
            PointSize: 12,
            Tracking: 0,
            Justification: "LeftAlign",
            StrokeColor: SWATCH_NONE_ID,
          },
          renderIdmlElement("Properties", {}, [
            renderIdmlElement("AppliedFont", { type: "string" }, baseFontFamily),
            renderIdmlElement("Leading", { type: "enumeration" }, "Auto"),
          ]),
        ),
        renderIdmlElement(
          "ParagraphStyle",
          {
            Self: "ParagraphStyle/$ID/NormalParagraphStyle",
            Name: "$ID/NormalParagraphStyle",
            Imported: false,
            NextStyle: "ParagraphStyle/$ID/NormalParagraphStyle",
            SplitDocument: false,
            EmitCss: true,
            IncludeClass: true,
          },
          renderIdmlElement("Properties", {}, [
            renderIdmlElement("BasedOn", { type: "string" }, "$ID/[No paragraph style]"),
            renderIdmlElement("PreviewColor", { type: "enumeration" }, "Nothing"),
          ]),
        ),
        ...paragraphStyleKeys.map((styleKey) => renderIdmlElement(
          "ParagraphStyle",
          {
            Self: buildParagraphStyleId(styleKey),
            Name: `SGG ${styleKey.replace(/(^|[_-])(\w)/g, (_, prefix, char) => `${prefix}${String(char).toUpperCase()}`)}`,
            Imported: false,
            SplitDocument: false,
            EmitCss: true,
            IncludeClass: true,
            Justification: "LeftAlign",
            SpaceBefore: 0,
            SpaceAfter: 0,
            LeftIndent: 0,
            RightIndent: 0,
            FirstLineIndent: 0,
          },
          renderIdmlElement("Properties", {}, [
            renderIdmlElement("BasedOn", { type: "string" }, "$ID/NormalParagraphStyle"),
            renderIdmlElement("PreviewColor", { type: "enumeration" }, "Nothing"),
          ]),
        )),
      ],
    ),
    renderIdmlElement(
      "RootObjectStyleGroup",
      { Self: "sggObjectRoot" },
      renderIdmlElement("ObjectStyle", {
        Self: "ObjectStyle/$ID/[None]",
        Name: "$ID/[None]",
        AppliedParagraphStyle: "ParagraphStyle/$ID/[No paragraph style]",
        FillColor: SWATCH_NONE_ID,
        FillTint: -1,
        StrokeWeight: 0,
        StrokeColor: SWATCH_NONE_ID,
        Nonprinting: false,
      }),
    ),
    `</idPkg:Styles>`,
  ].join("")
}

function buildPreferencesXml(document: SwissGridIdmlDocument): string {
  const firstPage = document.pages[0]
  const bleedPt = firstPage ? mmToPt(firstPage.uiSettings.exportBleedMm) : 0
  const baselineStart = firstPage ? firstPage.result.grid.margins.top : 36
  const baselineDivision = firstPage ? firstPage.result.grid.gridUnit : 12
  const firstWidth = firstPage ? firstPage.exportPlan.pageWidth : 595.276
  const firstHeight = firstPage ? firstPage.exportPlan.pageHeight : 841.89

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement("PageItemDefault", {
      AppliedGraphicObjectStyle: "ObjectStyle/$ID/[None]",
      AppliedTextObjectStyle: "ObjectStyle/$ID/[None]",
      AppliedGridObjectStyle: "ObjectStyle/$ID/[None]",
      FillColor: SWATCH_NONE_ID,
      StrokeWeight: 0,
      StrokeColor: SWATCH_NONE_ID,
      Nonprinting: false,
    }),
    renderIdmlElement("TextFramePreference", {
      TextColumnCount: 1,
      TextColumnGutter: 12,
      TextColumnFixedWidth: formatIdmlNumber(firstWidth),
      UseFixedColumnWidth: false,
      FirstBaselineOffset: "LeadingOffset",
      MinimumFirstBaselineOffset: 0,
      VerticalJustification: "TopAlign",
    }, renderIdmlElement(
      "Properties",
      {},
      renderIdmlElement(
        "InsetSpacing",
        { type: "list" },
        [
          renderIdmlElement("ListItem", { type: "unit" }, "0"),
          renderIdmlElement("ListItem", { type: "unit" }, "0"),
          renderIdmlElement("ListItem", { type: "unit" }, "0"),
          renderIdmlElement("ListItem", { type: "unit" }, "0"),
        ],
      ),
    )),
    renderIdmlElement("DocumentPreference", {
      PageHeight: formatIdmlNumber(firstHeight),
      PageWidth: formatIdmlNumber(firstWidth),
      FacingPages: false,
      DocumentBleedTopOffset: formatIdmlNumber(bleedPt),
      DocumentBleedBottomOffset: formatIdmlNumber(bleedPt),
      DocumentBleedInsideOrLeftOffset: formatIdmlNumber(bleedPt),
      DocumentBleedOutsideOrRightOffset: formatIdmlNumber(bleedPt),
      DocumentBleedUniformSize: true,
      PreserveLayoutWhenShuffling: true,
      AllowPageShuffle: true,
      OverprintBlack: true,
      PageBinding: "LeftToRight",
      ColumnDirection: "Horizontal",
      Intent: "PrintIntent",
      CreatePrimaryTextFrame: false,
      ColumnGuideLocked: true,
      MasterTextFrame: false,
      SnippetImportUsesOriginalLocation: false,
    }),
    renderIdmlElement(
      "GridPreference",
      {
        DocumentGridShown: false,
        DocumentGridSnapto: false,
        HorizontalGridlineDivision: 72,
        VerticalGridlineDivision: 72,
        HorizontalGridSubdivision: 8,
        VerticalGridSubdivision: 8,
        GridsInBack: true,
        BaselineGridShown: false,
        BaselineStart: formatIdmlNumber(baselineStart),
        BaselineDivision: formatIdmlNumber(baselineDivision),
        BaselineViewThreshold: 75,
        BaselineGridRelativeOption: "TopOfPageOfBaselineGridRelativeOption",
      },
      renderIdmlElement("Properties", {}, [
        renderIdmlElement("GridColor", { type: "enumeration" }, "LightGray"),
        renderIdmlElement("BaselineColor", { type: "enumeration" }, "LightBlue"),
      ]),
    ),
    renderIdmlElement(
      "GuidePreference",
      {
        GuidesInBack: false,
        GuidesShown: true,
        GuidesLocked: false,
        GuidesSnapto: true,
        RulerGuidesViewThreshold: 5,
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("RulerGuidesColor", { type: "enumeration" }, "Cyan")),
    ),
    `</idPkg:Preferences>`,
  ].join("")
}

function buildMasterSpreadXml(document: SwissGridIdmlDocument): string {
  const firstPage = document.pages[0]
  const pageWidth = firstPage ? firstPage.exportPlan.pageWidth : 595.276
  const pageHeight = firstPage ? firstPage.exportPlan.pageHeight : 841.89
  const margins = firstPage ? firstPage.result.grid.margins : { top: 36, bottom: 36, left: 36, right: 36 }
  const contentWidth = Math.max(0, pageWidth - margins.left - margins.right)
  const baseFont = firstPage?.baseFont ?? "Inter"
  const unit = firstPage?.result.grid.gridUnit ?? 12

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement(
      "MasterSpread",
      {
        Self: MASTER_SPREAD_ID,
        Name: "A-Parent",
        NamePrefix: "A",
        BaseName: "Parent",
        ShowMasterItems: true,
        PageCount: 1,
        OverriddenPageItemProps: "",
        PrimaryTextFrame: "n",
        ItemTransform: formatMatrix(IDENTITY_MATRIX),
      },
      [
        renderIdmlElement(
          "Properties",
          {},
          renderIdmlElement("PageColor", { type: "enumeration" }, "UseMasterColor"),
        ),
        renderIdmlElement(
          "Page",
          {
            Self: MASTER_PAGE_ID,
            TabOrder: "",
            AppliedMaster: "n",
            OverrideList: "",
            MasterPageTransform: formatMatrix(IDENTITY_MATRIX),
            Name: "A",
            AppliedTrapPreset: "TrapPreset/$ID/kDefaultTrapStyleName",
            GeometricBounds: `0 0 ${formatIdmlNumber(pageHeight)} ${formatIdmlNumber(pageWidth)}`,
            ItemTransform: formatMatrix(buildPageCoordinateTransform(pageHeight)),
            AppliedAlternateLayout: "n",
            LayoutRule: "Off",
            SnapshotBlendingMode: "IgnoreLayoutSnapshots",
            OptionalPage: false,
            GridStartingPoint: "TopOutside",
            UseMasterGrid: true,
          },
          [
            renderIdmlElement(
              "Properties",
              {},
              renderIdmlElement("PageColor", { type: "enumeration" }, "UseMasterColor"),
            ),
            renderIdmlElement("MarginPreference", {
              ColumnCount: 1,
              ColumnGutter: formatIdmlNumber(firstPage?.result.grid.gridMarginHorizontal ?? 12),
              Top: formatIdmlNumber(margins.top),
              Bottom: formatIdmlNumber(margins.bottom),
              Left: formatIdmlNumber(margins.left),
              Right: formatIdmlNumber(margins.right),
              ColumnDirection: "Horizontal",
              ColumnsPositions: `0 ${formatIdmlNumber(contentWidth)}`,
            }),
            renderIdmlElement(
              "GridDataInformation",
              {
                FontStyle: "Regular",
                PointSize: formatIdmlNumber(unit),
                CharacterAki: 0,
                LineAki: formatIdmlNumber(Math.max(0, unit * 0.75)),
                HorizontalScale: 100,
                VerticalScale: 100,
                LineAlignment: "LeftOrTopLineJustify",
                GridAlignment: "AlignEmCenter",
                CharacterAlignment: "AlignEmCenter",
              },
              renderIdmlElement(
                "Properties",
                {},
                renderIdmlElement("AppliedFont", { type: "string" }, baseFont),
              ),
            ),
          ],
        ),
      ],
    ),
    `</idPkg:MasterSpread>`,
  ].join("")
}

function buildBackingStoryXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:BackingStory xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement(
      "XmlStory",
      {
        Self: BACKING_STORY_ID,
        UserText: true,
        IsEndnoteStory: false,
        AppliedTOCStyle: "n",
        TrackChanges: false,
        StoryTitle: "$ID/",
        AppliedNamedGrid: "n",
      },
      renderIdmlElement(
        "ParagraphStyleRange",
        { AppliedParagraphStyle: "ParagraphStyle/$ID/NormalParagraphStyle" },
        renderIdmlElement(
          "CharacterStyleRange",
          { AppliedCharacterStyle: "CharacterStyle/$ID/[No character style]" },
          [
            renderIdmlElement("Content", {}, "\uFEFF"),
            renderIdmlElement("XMLElement", {
              Self: "sggXmlRoot",
              MarkupTag: "XMLTag/Root",
            }),
            renderIdmlElement("Content", {}, "\uFEFF"),
          ],
        ),
      ),
    ),
    `</idPkg:BackingStory>`,
  ].join("")
}

function buildTagsXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Tags xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement(
      "XMLTag",
      {
        Self: "XMLTag/Root",
        Name: "Root",
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("TagColor", { type: "enumeration" }, "LightBlue")),
    ),
    `</idPkg:Tags>`,
  ].join("")
}

function buildMetadataXml(document: SwissGridIdmlDocument): string {
  const createdAt = document.metadata.createdAt ?? new Date().toISOString()
  const modifiedAt = new Date().toISOString()
  const title = document.metadata.title.trim() || "Swiss Grid Document"
  const author = document.metadata.author.trim()
  const description = document.metadata.description.trim()
  const seed = `${title}:${author}:${createdAt}:${document.pages.length}`

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
    `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Swiss Grid Generator">`,
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
    `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">`,
    `<dc:format>application/x-indesign</dc:format>`,
    `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeIdmlXml(title)}</rdf:li></rdf:Alt></dc:title>`,
    author
      ? `<dc:creator><rdf:Seq><rdf:li>${escapeIdmlXml(author)}</rdf:li></rdf:Seq></dc:creator>`
      : "",
    description
      ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeIdmlXml(description)}</rdf:li></rdf:Alt></dc:description>`
      : "",
    `<xmp:CreateDate>${escapeIdmlXml(createdAt)}</xmp:CreateDate>`,
    `<xmp:ModifyDate>${escapeIdmlXml(modifiedAt)}</xmp:ModifyDate>`,
    `<xmp:MetadataDate>${escapeIdmlXml(modifiedAt)}</xmp:MetadataDate>`,
    `<xmp:CreatorTool>Swiss Grid Generator</xmp:CreatorTool>`,
    `<xmpMM:DocumentID>${escapeIdmlXml(createDocumentUuid("xmp.did", seed))}</xmpMM:DocumentID>`,
    `<xmpMM:InstanceID>${escapeIdmlXml(createDocumentUuid("xmp.iid", `${seed}:instance`))}</xmpMM:InstanceID>`,
    `</rdf:Description>`,
    `</rdf:RDF>`,
    `</x:xmpmeta>`,
    `<?xpacket end="w"?>`,
  ].join("")
}

function buildDesignMapXml(
  document: SwissGridIdmlDocument,
  customSwatches: ColorSwatch[],
  spreads: SpreadExportRecord[],
  stories: StoryExportRecord[],
): string {
  const firstPage = document.pages[0]
  const docName = document.metadata.title.trim() || "Swiss Grid Document"
  const baseFont = firstPage?.baseFont ?? "Inter"
  const unit = firstPage?.result.grid.gridUnit ?? 12
  const storyList = [...stories.map((story) => story.id), BACKING_STORY_ID].join(" ")
  const sectionPageStart = spreads[0]?.pageId ?? MASTER_PAGE_ID

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="20.0(95)" ?>`,
    `<Document xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0" Self="${DOCUMENT_ID}" StoryList="${escapeIdmlXml(storyList)}" Name="${escapeIdmlXml(docName)}" ZeroPoint="0 0" ActiveLayer="${LAYER_TYPOGRAPHY_ID}" CMYKProfile="U.S. Web Coated (SWOP) v2" RGBProfile="sRGB IEC61966-2.1" SolidColorIntent="UseColorSettings" AfterBlendingIntent="UseColorSettings" DefaultImageIntent="UseColorSettings" RGBPolicy="PreserveEmbeddedProfiles" CMYKPolicy="CombinationOfPreserveAndSafeCmyk" AccurateLABSpots="false" AppliedMathMLFontSize="10" AppliedMathMLRgbColor="0 0 0" TintValue="100">`,
    renderIdmlElement(
      "Properties",
      {},
      renderIdmlElement("AppliedMathMLSwatch", { type: "enumeration" }, "Nothing"),
    ),
    renderIdmlElement("Language", {
      Self: "Language/$ID/English%3a USA",
      Name: "$ID/English: USA",
      SingleQuotes: "‘’",
      DoubleQuotes: "“”",
      PrimaryLanguageName: "$ID/English",
      SublanguageName: "$ID/USA",
      Id: 269,
      HyphenationVendor: "Hunspell",
      SpellingVendor: "Hunspell",
    }),
    renderIdmlElement("idPkg:Graphic", { src: "Resources/Graphic.xml" }),
    renderIdmlElement("idPkg:Fonts", { src: "Resources/Fonts.xml" }),
    renderIdmlElement("idPkg:Styles", { src: "Resources/Styles.xml" }),
    renderIdmlElement("NumberingList", {
      Self: "NumberingList/$ID/[Default]",
      Name: "$ID/[Default]",
      ContinueNumbersAcrossStories: false,
      ContinueNumbersAcrossDocuments: false,
    }),
    renderIdmlElement(
      "NamedGrid",
      {
        Self: "NamedGrid/$ID/[Page Grid]",
        Name: "$ID/[Page Grid]",
      },
      renderIdmlElement(
        "GridDataInformation",
        {
          FontStyle: "Regular",
          PointSize: formatIdmlNumber(unit),
          CharacterAki: 0,
          LineAki: formatIdmlNumber(Math.max(0, unit * 0.75)),
          HorizontalScale: 100,
          VerticalScale: 100,
          LineAlignment: "LeftOrTopLineJustify",
          GridAlignment: "AlignEmCenter",
          CharacterAlignment: "AlignEmCenter",
        },
        renderIdmlElement(
          "Properties",
          {},
          renderIdmlElement("AppliedFont", { type: "string" }, baseFont),
        ),
      ),
    ),
    renderIdmlElement("idPkg:Preferences", { src: "Resources/Preferences.xml" }),
    renderIdmlElement("idPkg:Tags", { src: "XML/Tags.xml" }),
    renderIdmlElement(
      "Layer",
      {
        Self: LAYER_PLACEHOLDERS_ID,
        Name: "Placeholders",
        Visible: true,
        Locked: false,
        IgnoreWrap: false,
        ShowGuides: false,
        LockGuides: false,
        UI: true,
        Expendable: true,
        Printable: true,
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("LayerColor", { type: "enumeration" }, "GrassGreen")),
    ),
    renderIdmlElement(
      "Layer",
      {
        Self: LAYER_TYPOGRAPHY_ID,
        Name: "Typography",
        Visible: true,
        Locked: false,
        IgnoreWrap: false,
        ShowGuides: false,
        LockGuides: false,
        UI: true,
        Expendable: true,
        Printable: true,
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("LayerColor", { type: "enumeration" }, "Magenta")),
    ),
    renderIdmlElement(
      "Layer",
      {
        Self: LAYER_GUIDES_ID,
        Name: "Guides",
        Visible: true,
        Locked: false,
        IgnoreWrap: false,
        ShowGuides: true,
        LockGuides: false,
        UI: true,
        Expendable: true,
        Printable: false,
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("LayerColor", { type: "enumeration" }, "LightBlue")),
    ),
    renderIdmlElement("idPkg:MasterSpread", { src: "MasterSpreads/MasterSpread_sggMaster.xml" }),
    renderIdmlElement(
      "ColorGroup",
      {
        Self: "ColorGroup/[Root Color Group]",
        Name: "[Root Color Group]",
        IsRootColorGroup: true,
      },
      [
        renderIdmlElement("ColorGroupSwatch", {
          Self: "sggColorGroupSwatch000",
          SwatchItemRef: SWATCH_NONE_ID,
        }),
        renderIdmlElement("ColorGroupSwatch", {
          Self: "sggColorGroupSwatch001",
          SwatchItemRef: COLOR_BLACK_ID,
        }),
        renderIdmlElement("ColorGroupSwatch", {
          Self: "sggColorGroupSwatch002",
          SwatchItemRef: COLOR_PAPER_ID,
        }),
        ...customSwatches.map((swatch, index) => renderIdmlElement("ColorGroupSwatch", {
          Self: `sggColorGroupSwatch${String(index + 3).padStart(3, "0")}`,
          SwatchItemRef: swatch.id,
        })),
      ],
    ),
    ...spreads.map((spread) => renderIdmlElement("idPkg:Spread", { src: spread.filePath })),
    renderIdmlElement(
      "Section",
      {
        Self: "sggSection",
        Length: document.pages.length,
        Name: "",
        ContinueNumbering: false,
        IncludeSectionPrefix: false,
        PageNumberStart: 1,
        Marker: "",
        PageStart: sectionPageStart,
        SectionPrefix: "",
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("PageNumberStyle", { type: "enumeration" }, "Arabic")),
    ),
    renderIdmlElement("idPkg:BackingStory", { src: "XML/BackingStory.xml" }),
    ...stories.map((story) => renderIdmlElement("idPkg:Story", { src: story.filePath })),
    `</Document>`,
  ].join("")
}

export async function buildSwissGridIdmlPackage(document: SwissGridIdmlDocument): Promise<Uint8Array> {
  if (!document.pages.length) {
    throw new Error("Cannot export IDML without project pages.")
  }

  const customSwatches = buildColorSwatches(document)
  const colorIdBySignature = new Map<string, string>([
    ["0,0,0", COLOR_BLACK_ID],
    ["255,255,255", COLOR_PAPER_ID],
    ...customSwatches.map((swatch) => [`${swatch.color.r},${swatch.color.g},${swatch.color.b}`, swatch.id] as const),
  ])
  const fontCatalog = await buildFontCatalog(document)
  const fonts = [...new Map(fontCatalog.values().map((font) => [`${font.family}|${font.styleName}`, font] as const)).values()]
  const { styles: characterStyles } = await buildCharacterStyles(
    document,
    colorIdBySignature,
    fontCatalog,
  )
  const paragraphStyleKeys = buildParagraphStyleKeys(document)
  const { spreads, stories } = await buildSpreadAndStories(document, colorIdBySignature)
  const designMapXml = buildDesignMapXml(document, customSwatches, spreads, stories)

  return zipSync({
    mimetype: [strToU8(IDML_MIMETYPE), { level: 0 }],
    "META-INF/container.xml": strToU8([
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
      `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">`,
      `<rootfiles>`,
      `<rootfile full-path="designmap.xml" media-type="text/xml"></rootfile>`,
      `</rootfiles>`,
      `</container>`,
    ].join("")),
    "META-INF/metadata.xml": strToU8(buildMetadataXml(document)),
    "Resources/Graphic.xml": strToU8(buildGraphicXml(customSwatches)),
    "Resources/Fonts.xml": strToU8(buildFontsXml(fonts)),
    "Resources/Styles.xml": strToU8(buildStylesXml(
      paragraphStyleKeys,
      characterStyles,
      fonts[0]?.family ?? document.pages[0]?.baseFont ?? "Inter",
    )),
    "Resources/Preferences.xml": strToU8(buildPreferencesXml(document)),
    "MasterSpreads/MasterSpread_sggMaster.xml": strToU8(buildMasterSpreadXml(document)),
    "XML/BackingStory.xml": strToU8(buildBackingStoryXml()),
    "XML/Tags.xml": strToU8(buildTagsXml()),
    "designmap.xml": strToU8(designMapXml),
    ...Object.fromEntries(spreads.map((spread) => [spread.filePath, strToU8(spread.xml)])),
    ...Object.fromEntries(stories.map((story) => [story.filePath, strToU8(story.xml)])),
  }, { level: 6 })
}
