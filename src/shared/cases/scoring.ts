// Scores a finished Academy case run. The rating measures the quality of the analysis only: hints and
// failed checks never lower it (they only affect the "Unassisted" medal and bonus XP, worked out elsewhere).
// Used by the app (Case Closed screen) and by scripts/verify-content.ts (scripted plays in tests.plays).

import type { CaseDef, CaseRun, Evidence, HypothesisStatus } from './types'

export type DimensionId = 'evidence' | 'dataQuality' | 'reasoning' | 'verdict' | 'recommendation' | 'limitations'

export interface Dimension {
  id: DimensionId
  label: string
  score: number
  max: number
  /** What the learner did well, for the debrief. */
  good: string[]
  /** What they missed or got wrong, for the debrief. */
  missed: string[]
}

export type Grade = 'distinguished' | 'solid' | 'provisional' | 'reopened'

export interface CaseScore {
  /** 0–100, rounded. */
  total: number
  grade: Grade
  dimensions: Dimension[]
  /** Set when the total was capped, with the reason (shown in the debrief). */
  capped?: string
}

/** A verdict that names the wrong main cause can't close the case: the rating stays below Provisional. */
export const WRONG_CAUSE_CAP = 49

export const GRADES: { grade: Grade; min: number; label: string }[] = [
  { grade: 'distinguished', min: 90, label: 'Distinguished' },
  { grade: 'solid', min: 70, label: 'Solid' },
  { grade: 'provisional', min: 50, label: 'Provisional' },
  { grade: 'reopened', min: 0, label: 'Reopened for review' }
]

export const gradeFor = (total: number): Grade => (GRADES.find((g) => total >= g.min) ?? GRADES[GRADES.length - 1]!).grade

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const round1 = (n: number) => Math.round(n * 10) / 10

export function scoreCase(c: CaseDef, run: CaseRun): CaseScore {
  const cracked = new Set(run.cracked)
  const leadById = new Map(c.leads.map((l) => [l.id, l]))
  const hypById = new Map(c.hypotheses.map((h) => [h.id, h]))
  const evidenceById = new Map(c.evidence.map((e) => [e.id, e]))
  // Evidence the learner holds: claims from the start, facts from cracked leads.
  const held = new Set<string>([
    ...c.evidence.filter((e) => e.kind === 'claim').map((e) => e.id),
    ...c.leads.filter((l) => cracked.has(l.id)).map((l) => l.evidence)
  ])
  const titleOf = (id: string) => evidenceById.get(id)?.title ?? id
  const hypTitle = (id: string) => hypById.get(id)?.title ?? id

  // ---- Evidence: core leads cracked.
  const core = c.leads.filter((l) => l.core)
  const coreCracked = core.filter((l) => cracked.has(l.id))
  const evidence: Dimension = {
    id: 'evidence',
    label: 'Evidence',
    max: 20,
    score: round1(20 * (core.length ? coreCracked.length / core.length : 1)),
    good: coreCracked.length ? [`Cracked ${coreCracked.length} of ${core.length} core leads.`] : [],
    missed: core.filter((l) => !cracked.has(l.id)).map((l) => `Lead not followed: "${l.title}". ${l.question}`)
  }
  const secrets = c.leads.filter((l) => l.secret && cracked.has(l.id))
  for (const l of secrets) evidence.good.push(`Found a hidden lead: "${l.title}".`)

  // ---- Data quality: the leads that expose problems in the data.
  const dq = c.scoring.dataQualityLeads.map((id) => leadById.get(id)).filter((l) => l !== undefined)
  const dqDone = dq.filter((l) => cracked.has(l.id))
  const dataQuality: Dimension = {
    id: 'dataQuality',
    label: 'Data quality',
    max: 10,
    score: round1(10 * (dq.length ? dqDone.length / dq.length : 1)),
    good: dqDone.map((l) => `Checked the data itself: "${l.title}".`),
    missed: dq.filter((l) => !cracked.has(l.id)).map((l) => `Data check skipped: "${l.title}". Always check the data before explaining a change.`)
  }

  // ---- Reasoning: hypothesis statuses on the board (12) and evidence links (8).
  const reasoning: Dimension = { id: 'reasoning', label: 'Reasoning', max: 20, score: 0, good: [], missed: [] }
  let rightStatuses = 0
  for (const h of c.hypotheses) {
    const expected: HypothesisStatus = h.truth === 'ruled-out' ? 'ruled-out' : 'supported'
    const status = run.board[h.id]?.status ?? 'open'
    if (status === expected) {
      rightStatuses++
      reasoning.good.push(`${expected === 'supported' ? 'Backed' : 'Ruled out'} "${h.title}" correctly.`)
    } else {
      const said = status === 'open' ? 'left it open' : `marked it ${status === 'supported' ? 'supported' : 'ruled out'}`
      reasoning.missed.push(`"${h.title}": you ${said}, but the evidence says it should be ${expected === 'supported' ? 'supported' : 'ruled out'}. ${h.explanation}`)
    }
  }
  let rightLinks = 0
  let wrongLinks = 0
  for (const [hypId, entry] of Object.entries(run.board)) {
    for (const [evId, link] of Object.entries(entry.links)) {
      if (!held.has(evId)) continue
      const actual = evidenceById.get(evId)?.relations[hypId]
      if (actual === link) rightLinks++
      else if (actual) {
        wrongLinks++
        reasoning.missed.push(`"${titleOf(evId)}" ${actual} "${hypTitle(hypId)}"; you linked it as ${link === 'supports' ? 'supporting' : 'contradicting'} it.`)
      }
    }
  }
  if (rightLinks) reasoning.good.push(`Linked ${rightLinks} piece${rightLinks === 1 ? '' : 's'} of evidence to the right hypotheses.`)
  if (rightLinks - wrongLinks < c.scoring.linksTarget) {
    reasoning.missed.push(`Connect more evidence on the board: say which hypothesis each finding supports or contradicts.`)
  }
  reasoning.score = round1(
    12 * (c.hypotheses.length ? rightStatuses / c.hypotheses.length : 1) + 8 * clamp01((rightLinks - wrongLinks) / c.scoring.linksTarget)
  )

  // ---- Verdict: cause (8), contributors (2), stakeholder theory (5), citations (6), pushback (4).
  const v = run.verdict
  const verdict: Dimension = { id: 'verdict', label: 'Verdict', max: 25, score: 0, good: [], missed: [] }
  const causeTruth = v.cause ? hypById.get(v.cause)?.truth : undefined
  const trueCauses = c.hypotheses.filter((h) => h.truth === 'cause')
  let causePoints = 0
  if (causeTruth === 'cause') {
    causePoints = 8
    verdict.good.push(`Named the real cause: "${hypTitle(v.cause!)}".`)
  } else if (causeTruth === 'contributor') {
    causePoints = 3
    verdict.missed.push(`"${hypTitle(v.cause!)}" made things look worse, but it isn't the main cause. The main cause: "${trueCauses.map((h) => h.title).join('", "')}".`)
  } else {
    verdict.missed.push(`The main cause was "${trueCauses.map((h) => h.title).join('", "')}".${v.cause ? ` "${hypTitle(v.cause)}" is ruled out by the evidence.` : ''}`)
  }

  const contributors = c.hypotheses.filter((h) => h.truth === 'contributor')
  const hits = v.contributors.filter((id) => hypById.get(id)?.truth === 'contributor').length
  const wrongContributors = v.contributors.filter((id) => hypById.get(id)?.truth === 'ruled-out')
  const contributorPoints = contributors.length
    ? 2 * clamp01((hits - wrongContributors.length) / contributors.length)
    : wrongContributors.length ? 0 : 2
  if (contributors.length && hits === contributors.length) verdict.good.push('Spotted what made the problem look bigger than it was.')
  for (const h of contributors) if (!v.contributors.includes(h.id)) verdict.missed.push(`Also part of the story: "${h.title}". ${h.explanation}`)
  for (const id of wrongContributors) verdict.missed.push(`"${hypTitle(id)}" didn't contribute: the evidence rules it out.`)

  const theoryOptions = c.verdict.theory.options
  const theoryChoice = theoryOptions.find((o) => o.id === v.theory)
  const theoryBest = Math.max(...theoryOptions.map((o) => o.score), 1)
  const theoryPoints = 5 * ((theoryChoice?.score ?? 0) / theoryBest)
  if (theoryChoice) (theoryChoice.score === theoryBest ? verdict.good : verdict.missed).push(theoryChoice.feedback)
  else verdict.missed.push(`You didn't answer: ${c.verdict.theory.question}`)

  // A citation counts when it is a fact that backs the learner's own conclusion: it supports a cause or contributor
  // they named (and that is true), or it contradicts a theory that is false and that they didn't name as the cause.
  const named = new Set([v.cause, ...v.contributors].filter((id) => id !== undefined))
  const isRelevant = (e: Evidence) =>
    e.kind === 'fact' &&
    Object.entries(e.relations).some(([h, rel]) => {
      const truth = hypById.get(h)?.truth
      if (rel === 'supports') return truth !== 'ruled-out' && named.has(h)
      return truth === 'ruled-out' && v.cause !== h
    })
  const cited = v.citations.filter((id) => held.has(id)).map((id) => evidenceById.get(id)).filter((e) => e !== undefined)
  const relevant = cited.filter(isRelevant)
  const irrelevant = cited.filter((e) => !isRelevant(e))
  const citationPoints = 6 * clamp01((relevant.length - 0.5 * irrelevant.length) / c.scoring.citationsTarget)
  if (relevant.length) verdict.good.push(`Backed the verdict with ${relevant.length} relevant finding${relevant.length === 1 ? '' : 's'}.`)
  for (const e of irrelevant) {
    verdict.missed.push(
      e.kind === 'claim'
        ? `"${e.title}" is a claim, not proof. Cite facts you found in the data.`
        : `"${e.title}" doesn't support your conclusion.`
    )
  }
  const uncitedKey = c.evidence.filter((e) => e.key && held.has(e.id) && isRelevant(e) && !v.citations.includes(e.id))
  if (relevant.length < c.scoring.citationsTarget && uncitedKey.length) {
    verdict.missed.push(`Strong evidence you had but didn't cite: ${uncitedKey.map((e) => `"${e.title}"`).join(', ')}.`)
  }

  let pushbackPoints = 0
  for (const p of c.verdict.pushback) {
    const best = Math.max(...p.options.map((o) => o.score), 1)
    const choice = p.options.find((o) => o.id === v.pushback[p.id])
    pushbackPoints += (choice?.score ?? 0) / best
    if (choice) (choice.score === best ? verdict.good : verdict.missed).push(choice.feedback)
  }
  pushbackPoints = c.verdict.pushback.length ? (4 * pushbackPoints) / c.verdict.pushback.length : 4
  verdict.score = round1(causePoints + contributorPoints + theoryPoints + citationPoints + pushbackPoints)

  // ---- Recommendation: the chosen options against the best possible set.
  const recs = c.verdict.recommendations
  const chosenRecs = v.recommendations.slice(0, recs.pick).map((id) => recs.options.find((o) => o.id === id)).filter((o) => o !== undefined)
  const bestRecs = [...recs.options].sort((a, b) => b.score - a.score).slice(0, recs.pick).reduce((s, o) => s + o.score, 0)
  const recommendation: Dimension = {
    id: 'recommendation',
    label: 'Recommendation',
    max: 15,
    score: round1(15 * clamp01(chosenRecs.reduce((s, o) => s + o.score, 0) / Math.max(bestRecs, 1))),
    good: chosenRecs.filter((o) => o.score > 0).map((o) => o.feedback),
    missed: chosenRecs.filter((o) => o.score === 0).map((o) => o.feedback)
  }
  const bestUnchosen = [...recs.options].sort((a, b) => b.score - a.score).slice(0, recs.pick).filter((o) => !chosenRecs.includes(o))
  for (const o of bestUnchosen) recommendation.missed.push(`A stronger recommendation: "${o.text}"`)

  // ---- Limitations: honest about what the analysis can't show.
  const lims = c.verdict.limitations
  const chosenLims = v.limitations.map((id) => lims.options.find((o) => o.id === id)).filter((o) => o !== undefined)
  const validChosen = chosenLims.filter((o) => o.valid)
  const invalidChosen = chosenLims.filter((o) => !o.valid)
  const validCount = lims.options.filter((o) => o.valid).length
  const limitations: Dimension = {
    id: 'limitations',
    label: 'Limitations',
    max: 10,
    score: round1(10 * clamp01((validChosen.length - invalidChosen.length) / Math.max(1, Math.min(lims.target, validCount)))),
    good: validChosen.map((o) => o.feedback),
    missed: invalidChosen.map((o) => o.feedback)
  }
  if (validChosen.length === 0) limitations.missed.push('Every analysis has limits. Naming them makes your conclusion more trustworthy, not less.')

  const dimensions = [evidence, dataQuality, reasoning, verdict, recommendation, limitations]
  const sum = Math.round(dimensions.reduce((s, d) => s + d.score, 0))
  if (causeTruth !== 'cause' && sum > WRONG_CAUSE_CAP) {
    return {
      total: WRONG_CAUSE_CAP,
      grade: gradeFor(WRONG_CAUSE_CAP),
      dimensions,
      capped: `Your work adds up to ${sum}, but the verdict names the wrong main cause, so the case stays open for review (rating capped at ${WRONG_CAUSE_CAP}).`
    }
  }
  return { total: sum, grade: gradeFor(sum), dimensions }
}
