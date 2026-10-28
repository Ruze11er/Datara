// Shows achievement toasts (bottom right) and promotion announcements (centred, until dismissed), and watches
// progress for newly earned achievements and promotions.

import { useEffect } from 'react'
import { Award, BadgeCheck, X } from 'lucide-react'
import { useProgress } from '../lib/ProgressContext'
import { academyRank } from '../lib/academyXp'
import { newAchievements } from '../lib/achievements'
import { dismissToast, showToast, useToasts } from '../lib/toasts'

/** Stores newly earned achievements and announces promotions. Each is announced once. */
function useAcademyWatcher() {
  const { progress, update } = useProgress()
  useEffect(() => {
    if (!progress) return
    const fresh = newAchievements(progress)
    const rank = academyRank(progress).current.rank
    if (fresh.length === 0 && progress.academy.rankSeen === rank) return
    let promotedTo: string | null = null
    update((p) => {
      const now = new Date().toISOString()
      const achievements = { ...p.academy.achievements }
      for (const a of newAchievements(p)) achievements[a.id] = now
      const next = { ...p, academy: { ...p.academy, achievements } }
      const r = academyRank(next).current
      // The first time, the current rank is recorded quietly (it may come from earlier lab and lesson work).
      if (p.academy.rankSeen !== undefined && r.rank > p.academy.rankSeen) promotedTo = r.title
      next.academy.rankSeen = r.rank
      return next
    })
    // Several at once (closing a strong case) become one toast instead of a stack covering the screen.
    if (fresh.length >= 3) {
      showToast({ kind: 'achievement', title: `${fresh.length} achievements earned`, body: fresh.map((a) => a.title).join(', ') })
    } else {
      for (const a of fresh) showToast({ kind: 'achievement', title: a.title, body: a.description })
    }
    if (promotedTo) {
      showToast({
        kind: 'promotion',
        title: `Promoted: ${promotedTo}`,
        body: 'The Chief has signed your promotion. New cases will reach your desk as they come in.'
      })
    }
  }, [progress, update])
}

export function ToastHost() {
  useAcademyWatcher()
  const toasts = useToasts()
  const promotion = toasts.find((t) => t.kind === 'promotion')
  const achievements = toasts.filter((t) => t.kind === 'achievement')

  return (
    <>
      <div className="pointer-events-none fixed right-5 bottom-5 z-40 flex w-80 flex-col gap-2" aria-live="polite">
        {achievements.map((t) => (
          <div key={t.id} className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-amber-200 bg-surface px-4 py-3 shadow-lg">
            <Award size={22} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Achievement</div>
              <div className="font-semibold text-slate-900">{t.title}</div>
              <div className="text-sm text-slate-600">{t.body}</div>
            </div>
            <button type="button" onClick={() => dismissToast(t.id)} className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Dismiss">
              <X size={14} aria-hidden />
            </button>
          </div>
        ))}
      </div>
      {promotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
          <div className="toast-in w-full max-w-md rounded-2xl border border-slate-200 bg-surface p-8 text-center shadow-xl">
            <BadgeCheck size={44} className="mx-auto text-brand-600" aria-hidden />
            <div className="mt-3 font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase">Data Detective Academy</div>
            <h2 id="promotion-title" className="mt-1 text-2xl font-semibold text-slate-900">
              {promotion.title}
            </h2>
            <p className="mt-2 text-slate-600">{promotion.body}</p>
            <button
              type="button"
              autoFocus
              onClick={() => dismissToast(promotion.id)}
              className="mt-6 rounded-lg bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700"
            >
              Carry on, detective
            </button>
          </div>
        </div>
      )}
    </>
  )
}
