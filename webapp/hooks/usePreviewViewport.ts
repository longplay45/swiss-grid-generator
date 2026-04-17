import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { RefObject } from "react"

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

type Args = {
  previewContainerRef: RefObject<HTMLDivElement | null>
  pageWidthPt: number
  pageHeightPt: number
  smartTextZoomEnabled?: boolean
  smartTextZoomTargetKey?: string | null
  smartTextZoomTargetVersion?: number
  getSmartTextZoomTargetRect?: () => Rect | null
}

export function usePreviewViewport({
  previewContainerRef,
  pageWidthPt,
  pageHeightPt,
  smartTextZoomEnabled = false,
  smartTextZoomTargetKey = null,
  smartTextZoomTargetVersion = 0,
  getSmartTextZoomTargetRect,
}: Args) {
  const [scale, setScale] = useState(1)
  const [pixelRatio, setPixelRatio] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [containerWidthCss, setContainerWidthCss] = useState(0)
  const [containerHeightCss, setContainerHeightCss] = useState(0)
  const [stageLeftCss, setStageLeftCss] = useState(0)
  const [stageTopCss, setStageTopCss] = useState(0)
  useLayoutEffect(() => {
    const calculateScale = () => {
      const container = previewContainerRef.current
      if (!container) return

      setContainerWidthCss((prev) => (Math.abs(prev - container.clientWidth) < 0.5 ? prev : container.clientWidth))
      setContainerHeightCss((prev) => (Math.abs(prev - container.clientHeight) < 0.5 ? prev : container.clientHeight))

      const viewportPadding = 40
      const zoomFillRatio = 0.75
      const maxZoomMultiplier = 8
      const containerWidth = Math.max(1, container.clientWidth - viewportPadding)
      const containerHeight = Math.max(1, container.clientHeight - viewportPadding)
      const fitScale = Math.min(containerWidth / pageWidthPt, containerHeight / pageHeightPt)
      let nextScale = fitScale
      let nextStageLeft = (container.clientWidth - pageWidthPt * fitScale) / 2
      let nextStageTop = (container.clientHeight - pageHeightPt * fitScale) / 2

      if (smartTextZoomEnabled && smartTextZoomTargetKey && getSmartTextZoomTargetRect) {
        const targetRect = getSmartTextZoomTargetRect()
        if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
          const focusScale = Math.min(
            (containerWidth * zoomFillRatio) / targetRect.width,
            (containerHeight * zoomFillRatio) / targetRect.height,
          )
          nextScale = Math.max(fitScale, Math.min(fitScale * maxZoomMultiplier, focusScale))
          const focusCenterX = (targetRect.x + targetRect.width / 2) * nextScale
          const focusCenterY = (targetRect.y + targetRect.height / 2) * nextScale
          nextStageLeft = container.clientWidth / 2 - focusCenterX
          nextStageTop = container.clientHeight / 2 - focusCenterY
        }
      }

      setScale((prev) => (Math.abs(prev - nextScale) < 0.0001 ? prev : nextScale))
      setStageLeftCss((prev) => (Math.abs(prev - nextStageLeft) < 0.5 ? prev : nextStageLeft))
      setStageTopCss((prev) => (Math.abs(prev - nextStageTop) < 0.5 ? prev : nextStageTop))
    }

    calculateScale()
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(calculateScale)
      : null
    if (observer && previewContainerRef.current) observer.observe(previewContainerRef.current)
    window.addEventListener("resize", calculateScale)

    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", calculateScale)
    }
  }, [
    getSmartTextZoomTargetRect,
    pageHeightPt,
    pageWidthPt,
    previewContainerRef,
    smartTextZoomEnabled,
    smartTextZoomTargetKey,
    smartTextZoomTargetVersion,
  ])

  useEffect(() => {
    const readDevicePixelRatio = () => Math.max(1, window.devicePixelRatio || 1)
    const applyDevicePixelRatio = () => {
      const nextRatio = readDevicePixelRatio()
      setPixelRatio((prev) => (Math.abs(prev - nextRatio) < 0.01 ? prev : nextRatio))
    }

    applyDevicePixelRatio()
    let mediaQuery = window.matchMedia(`(resolution: ${readDevicePixelRatio()}dppx)`)
    const handleDprChange = () => {
      applyDevicePixelRatio()
      mediaQuery.removeEventListener("change", handleDprChange)
      mediaQuery = window.matchMedia(`(resolution: ${readDevicePixelRatio()}dppx)`)
      mediaQuery.addEventListener("change", handleDprChange)
    }

    mediaQuery.addEventListener("change", handleDprChange)
    window.addEventListener("resize", applyDevicePixelRatio)
    window.addEventListener("orientationchange", applyDevicePixelRatio)
    window.visualViewport?.addEventListener("resize", applyDevicePixelRatio)

    return () => {
      mediaQuery.removeEventListener("change", handleDprChange)
      window.removeEventListener("resize", applyDevicePixelRatio)
      window.removeEventListener("orientationchange", applyDevicePixelRatio)
      window.visualViewport?.removeEventListener("resize", applyDevicePixelRatio)
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const pageWidthCss = pageWidthPt * scale
  const pageHeightCss = pageHeightPt * scale
  const pageWidthPx = Math.max(1, Math.round(pageWidthCss * pixelRatio))
  const pageHeightPx = Math.max(1, Math.round(pageHeightCss * pixelRatio))

  return {
    scale,
    pixelRatio,
    isMobile,
    containerWidthCss,
    containerHeightCss,
    stageLeftCss,
    stageTopCss,
    pageWidthCss,
    pageHeightCss,
    pageWidthPx,
    pageHeightPx,
  }
}
