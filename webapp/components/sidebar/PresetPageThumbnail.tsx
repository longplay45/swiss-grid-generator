"use client"

import { useEffect, useRef } from "react"

import type { LayoutPresetBrowserPage } from "@/lib/presets/types"
import {
  collectPresetThumbnailFontLoadSpecs,
  drawPresetThumbnailToCanvas,
} from "@/lib/preset-thumbnail-render"

type Props = {
  page: LayoutPresetBrowserPage
}

export function PresetPageThumbnail({ page }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    let frameId = 0
    let cancelled = false

    const draw = () => {
      frameId = 0
      if (cancelled) return
      const rect = host.getBoundingClientRect()
      drawPresetThumbnailToCanvas(
        canvas,
        page,
        rect.width,
        rect.height,
        window.devicePixelRatio || 1,
      )
    }

    const scheduleDraw = () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(draw)
    }

    scheduleDraw()

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => scheduleDraw())
      : null
    resizeObserver?.observe(host)

    const handleWindowResize = () => scheduleDraw()
    window.addEventListener("resize", handleWindowResize)

    const fontSpecs = collectPresetThumbnailFontLoadSpecs(page)
    if (fontSpecs.length > 0 && typeof document !== "undefined" && "fonts" in document) {
      void Promise
        .allSettled(fontSpecs.map((spec) => document.fonts.load(spec)))
        .then(() => {
          if (!cancelled) scheduleDraw()
        })
    }

    return () => {
      cancelled = true
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      window.removeEventListener("resize", handleWindowResize)
    }
  }, [page])

  return (
    <div ref={hostRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-full w-full"
      />
    </div>
  )
}
