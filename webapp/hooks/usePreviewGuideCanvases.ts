import { useEffect } from "react"
import type { RefObject } from "react"

import type { GridResult } from "@/lib/grid-calculator"
import { renderStaticGuides } from "@/lib/render-static-guides"

type Args = {
  staticCanvasRef: RefObject<HTMLCanvasElement | null>
  imageCanvasRef: RefObject<HTMLCanvasElement | null>
  pixelRatio: number
  result: GridResult
  scale: number
  rotation: number
  canvasBackground: string | null
  showMargins: boolean
  showModules: boolean
  showBaselines: boolean
  isMobile: boolean
}

export function usePreviewGuideCanvases({
  staticCanvasRef,
  imageCanvasRef,
  pixelRatio,
  result,
  scale,
  rotation,
  canvasBackground,
  showMargins,
  showModules,
  showBaselines,
  isMobile,
}: Args) {
  useEffect(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
      const markName = "sgg:guides"
      if (typeof performance.mark === "function") performance.mark(`${markName}:start`)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      renderStaticGuides({
        ctx,
        canvasWidth: cssWidth,
        canvasHeight: cssHeight,
        result,
        scale,
        rotation,
        backgroundColor: canvasBackground,
        showMargins,
        showModules,
        showBaselines,
        isMobile,
      })
      if (typeof performance.mark === "function" && typeof performance.measure === "function") {
        performance.mark(`${markName}:end`)
        try {
          performance.measure(markName, `${markName}:start`, `${markName}:end`)
        } catch {
          // Ignore missing/invalid marks.
        }
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    canvasBackground,
    isMobile,
    pixelRatio,
    result,
    rotation,
    scale,
    showBaselines,
    showMargins,
    showModules,
    staticCanvasRef,
  ])

  useEffect(() => {
    const canvas = imageCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, cssWidth, cssHeight)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [imageCanvasRef, pixelRatio])
}
