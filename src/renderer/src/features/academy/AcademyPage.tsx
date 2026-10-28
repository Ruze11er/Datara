// Data Detective Academy headquarters: the cases on file and how far each one has got.

import { Link } from 'react-router'
import { FolderOpen, LockKeyhole, SearchCheck } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { Markdown } from '../../components/Markdown'
import { cases } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { GRADES } from '@shared/cases/scoring'
import { caseProgress, caseStats, isCaseUnlocked } from '../../lib/caseProgress'
import { FileLabel, ProgressBar, Stamp } from './CaseParts'

export default function AcademyPage() {
  const { progress } = useProgress()
  const anyStarted = cases.some((c) => caseProgress(progress, c.id))

  return (
    <Page title="Data Detective Academy" subtitle="Every number tells a story. Your job is to find out which one is true.">
      {!anyStarted && (
        <Card className="mb-6">
          <FileLabel>From the Chief</FileLabel>
          <Markdown
            text={
              'Welcome to the Academy, rookie. Cases land on this desk when a business gets a number it can\'t explain. ' +
              'Each one comes with real data, a few people who are sure they know the answer, and a question nobody has ' +
              'checked properly.\n\nYou follow the leads, prove what you can, and bring back a verdict. Start with the case below.'
            }
            className="text-slate-700"
          />
        </Card>
      )}

      <FileLabel>Case files</FileLabel>
      <div className="space-y-4">
        {cases.map((c, i) => {
          const cp = caseProgress(progress, c.id)
          const unlocked = isCaseUnlocked(progress, cases, i)
          const best = cp?.best
          const closed = cp?.stage === 'closed'
          const stats = caseStats(c, cp)
          return (
            <Card key={c.id} className={unlocked ? '' : 'bg-slate-50'}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stamp>Case #{c.number}</Stamp>
                    {!unlocked ? (
                      <Stamp>Classified</Stamp>
                    ) : closed ? (
                      <Stamp tone="solved">Closed</Stamp>
                    ) : cp ? (
                      <Stamp tone="open">Open</Stamp>
                    ) : (
                      <Stamp tone="alert">New</Stamp>
                    )}
                    <span className="text-xs text-slate-500">{c.company}</span>
                  </div>
                  <h2 className="mt-1.5 text-xl font-semibold text-slate-900">{c.title}</h2>
                  <p className="mt-1 text-slate-600">{c.summary}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    <span className="font-medium text-slate-600">Recommended training:</span> {c.recommendedTraining}
                  </p>
                </div>
                <div className="flex w-56 shrink-0 flex-col gap-3">
                  {best && (
                    <p className="text-sm text-slate-600">
                      Best rating: <b className="text-slate-900">{GRADES.find((g) => g.grade === best.grade)?.label}</b> ({best.total}/100)
                    </p>
                  )}
                  {cp && !closed && (
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>Core leads cracked</span>
                        <span>
                          {stats.coreCracked} of {stats.coreTotal}
                        </span>
                      </div>
                      <ProgressBar value={stats.coreCracked} max={stats.coreTotal} label="Core leads cracked" />
                    </div>
                  )}
                  {unlocked ? (
                    <Link
                      to={`/academy/${c.id}/${closed ? 'verdict' : cp ? 'lab' : 'briefing'}`}
                      className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
                    >
                      {cp && !closed ? <SearchCheck size={17} aria-hidden /> : <FolderOpen size={17} aria-hidden />}
                      {closed ? 'Read the debrief' : cp ? 'Continue the investigation' : 'Open the case file'}
                    </Link>
                  ) : (
                    <span className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-slate-400">
                      <LockKeyhole size={16} aria-hidden /> Close the previous case
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
