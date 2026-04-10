import { useEffect, useState } from "react"
import type { RefObject } from "react"

type Args = {
  previewContainerRef: RefObject<HTMLDivElement | null>
  pageWidthPt: number
  pageHeightPt: number
}

export function usePreviewViewport({
  previewContainerRef,
  pageWidthPt,
  pageHeightPt,
}: Args) {
  const [scale, setScale] = useState(1)
  const [pixelRatio, setPixelRatio] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [containerWidthCss, setContainerWidthCss] = useState(0)
  const [containerHeightCss, setContainerHeightCss] = useState(0)

  useEffect(() => {
    const calculateScale = () => {
      const container = previewContainerRef.current
      if (!container) return

      setContainerWidthCss((prev) => (Math.abs(prev - container.clientWidth) < 0.5 ? prev : container.clientWidth))
      setContainerHeightCss((prev) => (Math.abs(prev - container.clientHeight) < 0.5 ? prev : container.clientHeight))

      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40
      const nextScale = Math.min(containerWidth / pageWidthPt, containerHeight / pageHeightPt)

      setScale((prev) => (Math.abs(prev - nextScale) < 0.0001 ? prev : nextScale))
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
  }, [pageHeightPt, pageWidthPt, previewContainerRef])

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
    pageWidthCss,
    pageHeightCss,
    pageWidthPx,
    pageHeightPx,
  }
}
