import { useCallback, useRef, useState } from "react"

type CommandToken = number

type LoadedLayoutState<Layout> = {
  token: CommandToken
  layout: Layout
} | null

type LayerOrderRequest = {
  token: CommandToken
  order: string[]
} | null

type LayerDeleteRequest = {
  token: CommandToken
  target: string
} | null

type LayerEditorRequest = {
  token: CommandToken
  target: string
} | null

type Args<Layout> = {
  defaultLayout: Layout | null
}

export function usePreviewCommands<Layout>({ defaultLayout }: Args<Layout>) {
  const commandTokenRef = useRef<CommandToken>(1)
  const [loadedLayoutState, setLoadedLayoutState] = useState<LoadedLayoutState<Layout>>(() =>
    defaultLayout ? { token: 1, layout: defaultLayout } : null,
  )
  const [layerOrderRequest, setLayerOrderRequest] = useState<LayerOrderRequest>(null)
  const [layerDeleteRequest, setLayerDeleteRequest] = useState<LayerDeleteRequest>(null)
  const [layerEditorRequest, setLayerEditorRequest] = useState<LayerEditorRequest>(null)

  const issueCommandToken = useCallback(() => {
    commandTokenRef.current += 1
    return commandTokenRef.current
  }, [])

  const requestLayerOrder = useCallback((order: string[]) => {
    setLayerOrderRequest({
      token: issueCommandToken(),
      order,
    })
  }, [issueCommandToken])

  const requestLayerDelete = useCallback((target: string) => {
    setLayerDeleteRequest({
      token: issueCommandToken(),
      target,
    })
  }, [issueCommandToken])

  const requestLayerEditor = useCallback((target: string) => {
    setLayerEditorRequest({
      token: issueCommandToken(),
      target,
    })
  }, [issueCommandToken])

  const loadLayout = useCallback((layout: Layout | null) => {
    if (!layout) {
      setLoadedLayoutState(null)
      return
    }
    setLoadedLayoutState({
      token: issueCommandToken(),
      layout,
    })
  }, [issueCommandToken])

  const clearLayerRequests = useCallback(() => {
    setLayerOrderRequest(null)
    setLayerDeleteRequest(null)
    setLayerEditorRequest(null)
  }, [])

  return {
    loadedLayoutState,
    layerOrderRequest,
    layerDeleteRequest,
    layerEditorRequest,
    requestLayerOrder,
    requestLayerDelete,
    requestLayerEditor,
    loadLayout,
    clearLayerRequests,
  }
}
