// Small pop-up messages (achievements, promotions). Shown by app/ToastHost.tsx.

import { useEffect, useState } from 'react'

export interface Toast {
  id: number
  kind: 'achievement' | 'promotion'
  title: string
  body: string
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<(t: Toast[]) => void>()
const emit = () => listeners.forEach((l) => l(toasts))

/** Achievements disappear by themselves; a promotion stays until dismissed. */
export function showToast(toast: Omit<Toast, 'id'>): void {
  const id = nextId++
  toasts = [...toasts, { ...toast, id }]
  emit()
  if (toast.kind === 'achievement') window.setTimeout(() => dismissToast(id), 8000)
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToasts(): Toast[] {
  const [list, setList] = useState(toasts)
  useEffect(() => {
    listeners.add(setList)
    return () => {
      listeners.delete(setList)
    }
  }, [])
  return list
}
