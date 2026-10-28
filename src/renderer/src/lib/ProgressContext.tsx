import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { ProgressData } from '@shared/progress'
import { normalizeProgress, progressStorage } from './progressStorage'

interface ProgressContextValue {
  /** null while the saved progress is still loading */
  progress: ProgressData | null
  saveError: string | null
  update: (change: (current: ProgressData) => ProgressData) => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const latest = useRef<ProgressData | null>(null)

  useEffect(() => {
    progressStorage
      .load()
      .catch(() => null)
      .then((raw) => {
        latest.current = normalizeProgress(raw)
        setProgress(latest.current)
      })
  }, [])

  const update = useCallback((change: (current: ProgressData) => ProgressData) => {
    if (!latest.current) return
    const next = change(latest.current)
    if (next === latest.current) return // nothing changed, nothing to save
    latest.current = next
    setProgress(next)
    progressStorage.save(next).then(
      () => setSaveError(null),
      (err: unknown) => setSaveError(err instanceof Error ? err.message : String(err))
    )
  }, [])

  return (
    <ProgressContext.Provider value={{ progress, saveError, update }}>{children}</ProgressContext.Provider>
  )
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext)
  if (!value) throw new Error('useProgress must be used inside ProgressProvider')
  return value
}
