import { useCallback, useEffect, useRef } from "react"

type WorkerBridgeOptions<TResult> = {
  enabled?: boolean
  createWorker: () => Worker
  parseMessage: (data: unknown) => { id: number; result: TResult } | null
}

type WorkerBridgeRequest<TResult> = {
  requestId: number
  promise: Promise<TResult>
}

export function useWorkerBridge<TInput, TResult>({
  enabled = true,
  createWorker,
  parseMessage,
}: WorkerBridgeOptions<TResult>) {
  const workerRef = useRef<Worker | null>(null)
  const resolversRef = useRef<Map<number, (result: TResult) => void>>(new Map())
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!enabled || typeof Worker === "undefined") return

    const worker = createWorker()
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<unknown>) => {
      const parsed = parseMessage(event.data)
      if (!parsed) return
      const resolve = resolversRef.current.get(parsed.id)
      if (!resolve) return
      resolversRef.current.delete(parsed.id)
      resolve(parsed.result)
    }

    worker.onerror = () => {
      worker.terminate()
      workerRef.current = null
      resolversRef.current.clear()
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      resolversRef.current.clear()
    }
  }, [createWorker, enabled, parseMessage])

  const postRequest = useCallback((input: TInput): WorkerBridgeRequest<TResult> | null => {
    const worker = workerRef.current
    if (!worker) return null

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const promise = new Promise<TResult>((resolve) => {
      resolversRef.current.set(requestId, resolve)
      worker.postMessage({ id: requestId, input })
    })
    return { requestId, promise }
  }, [])

  const cancelRequest = useCallback((requestId: number) => {
    if (requestId <= 0) return
    resolversRef.current.delete(requestId)
  }, [])

  return {
    postRequest,
    cancelRequest,
  }
}
