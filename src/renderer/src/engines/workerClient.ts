// Talks to an engine running in a background worker. If a request runs too
// long (for example an infinite loop), the worker is killed and a fresh one is
// started on the next request, so the app itself never freezes.

export class EngineTimeoutError extends Error {}

type Response = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string }

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class WorkerClient {
  private worker: Worker | null = null
  private nextId = 1
  private readonly pending = new Map<number, Pending>()

  constructor(private readonly createWorker: () => Worker) {}

  request<T>(type: string, payload: unknown, timeoutMs: number, timeoutMessage: string): Promise<T> {
    const worker = this.ensureWorker()
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => this.restart(new EngineTimeoutError(timeoutMessage)), timeoutMs)
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer })
      worker.postMessage({ id, type, payload })
    })
  }

  /** Kills the worker and fails every request still waiting on it. */
  restart(reason: Error = new Error('The engine was restarted.')): void {
    this.worker?.terminate()
    this.worker = null
    for (const p of this.pending.values()) {
      clearTimeout(p.timer)
      p.reject(reason)
    }
    this.pending.clear()
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    const worker = this.createWorker()
    worker.onmessage = (event: MessageEvent<Response>) => {
      const p = this.pending.get(event.data.id)
      if (!p) return
      clearTimeout(p.timer)
      this.pending.delete(event.data.id)
      if (event.data.ok) p.resolve(event.data.result)
      else p.reject(new Error(event.data.error))
    }
    worker.onerror = (event) => {
      event.preventDefault()
      this.restart(new Error(event.message || 'The engine stopped unexpectedly.'))
    }
    this.worker = worker
    return worker
  }
}
