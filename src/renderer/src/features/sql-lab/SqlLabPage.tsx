import { Link } from 'react-router'
import { ArrowRight, Lock, Trophy } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { Stars } from '../../components/Stars'
import { getSqlLevel, sqlChapters } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { chapterStats, isChapterUnlocked, levelProgress, nextSqlLevel, overallSqlStats } from '../../lib/sqlProgress'

export default function SqlLabPage() {
  const { progress } = useProgress()
  const next = nextSqlLevel(progress)
  const overall = overallSqlStats(progress)

  return (
    <Page title="SQL Lab" subtitle="Answer business questions with SQL on a sample online-shop database.">
      <Card className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">
            {overall.solved} of {overall.total} levels solved · {overall.stars} of {overall.maxStars} stars
          </div>
          <div className="mt-1 font-semibold text-slate-900">
            {next ? `Next up: Level ${next.number}, ${next.title}` : 'You have solved every available level. Great work!'}
          </div>
        </div>
        {next && (
          <Link
            to={`/sql/${next.id}`}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {overall.solved === 0 ? 'Start' : 'Continue'} <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </Card>

      <div className="space-y-5">
        {sqlChapters.map((chapter, chapterIndex) => {
          const unlocked = isChapterUnlocked(progress, chapterIndex)
          const stats = chapterStats(progress, chapterIndex)
          return (
            <Card key={chapter.id} className={unlocked ? '' : 'bg-slate-50'}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    {!unlocked && <Lock size={16} className="text-slate-400" aria-label="Locked" />}
                    Chapter {chapterIndex + 1}: {chapter.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">{chapter.description}</p>
                </div>
                <div className="shrink-0 text-right text-sm text-slate-500">
                  <div>
                    {stats.solved}/{stats.total} solved
                  </div>
                  <div>
                    {stats.stars}/{stats.maxStars} stars
                  </div>
                </div>
              </div>

              {!unlocked && (
                <p className="mt-3 text-sm text-slate-500">Solve every level in Chapter {chapterIndex} to unlock this chapter.</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {chapter.levels.map((id) => {
                  const level = getSqlLevel(id)
                  if (!level) return null
                  const lp = levelProgress(progress, id)
                  const solved = lp.status === 'solved'
                  const tile = (
                    <div
                      className={`flex h-full flex-col rounded-lg border px-3 py-2.5 text-sm ${
                        !unlocked
                          ? 'border-slate-200 text-slate-400'
                          : solved
                            ? 'border-brand-100 bg-brand-50/60 hover:border-brand-500'
                            : level.isMilestone
                              ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400'
                              : 'border-slate-200 bg-white hover:border-brand-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Level {level.number}</span>
                        {level.isMilestone && <Trophy size={13} className="text-amber-500" aria-label="Milestone level" />}
                      </div>
                      <div className={`mt-0.5 leading-snug font-medium ${unlocked ? 'text-slate-800' : ''}`}>
                        {level.title.replace(/^Milestone:\s*/, '')}
                      </div>
                      <div className="mt-auto pt-1.5">{unlocked && <Stars count={lp.stars} size={12} />}</div>
                    </div>
                  )
                  return unlocked ? (
                    <Link key={id} to={`/sql/${id}`} className="block">
                      {tile}
                    </Link>
                  ) : (
                    <div key={id} aria-disabled>
                      {tile}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
