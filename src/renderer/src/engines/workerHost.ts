// Worker-side half of WorkerClient. Requests are handled one at a time, in
// order, because the SQL and Python engines are not safe to run concurrently.

// Payload types differ per handler, so `any` is used at this one boundary.
type Handler = (payload: any) => unknown

interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null
  postMessage(message: unknown): void
}

export function serve(handlers: Record<string, Handler>): void {
  const scope = self as unknown as WorkerScope
  let queue: Promise<void> = Promise.resolve()

  scope.onmessage = (event) => {
    const { id, type, payload } = event.data as { id: number; type: string; payload: unknown }
    queue = queue.then(async () => {
      try {
        const handler = handlers[type]
        if (!handler) throw new Error(`Unknown engine request: ${type}`)
        scope.postMessage({ id, ok: true, result: await handler(payload) })
      } catch (err) {
        scope.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    })
  }
}
