import { useState } from 'react'
import { CircleCheck, CircleX, RotateCcw } from 'lucide-react'
import type { QuizQuestion } from '@shared/content'

interface QuizProps {
  questions: QuizQuestion[]
  bestScore?: number
  onFinish: (score: number) => void
}

export function Quiz({ questions, bestScore, onFinish }: QuizProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = answers.every((a) => a !== null)
  const correct = answers.filter((a, i) => a === questions[i]?.answer).length

  function submit() {
    setSubmitted(true)
    onFinish(correct / questions.length)
  }

  function retry() {
    setAnswers(questions.map(() => null))
    setSubmitted(false)
  }

  return (
    <div>
      <ol className="space-y-5">
        {questions.map((q, qi) => (
          <li key={qi}>
            <p className="font-medium text-slate-900">
              {qi + 1}. {q.question}
            </p>
            <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={`Question ${qi + 1}`}>
              {q.options.map((option, oi) => {
                const chosen = answers[qi] === oi
                const isAnswer = q.answer === oi
                let style = 'border-slate-200 hover:border-slate-300'
                if (!submitted && chosen) style = 'border-brand-500 bg-brand-50'
                if (submitted && isAnswer) style = 'border-brand-500 bg-brand-50'
                if (submitted && chosen && !isAnswer) style = 'border-red-300 bg-red-50'
                return (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${style} ${submitted ? 'cursor-default' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`q${qi}`}
                      className="accent-brand-600"
                      checked={chosen}
                      disabled={submitted}
                      onChange={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                    />
                    <span className="flex-1 text-slate-800">{option}</span>
                    {submitted && isAnswer && <CircleCheck size={16} className="text-brand-600" aria-label="Correct answer" />}
                    {submitted && chosen && !isAnswer && <CircleX size={16} className="text-red-500" aria-label="Your answer" />}
                  </label>
                )
              })}
            </div>
            {submitted && <p className="mt-2 text-sm text-slate-600">{q.explanation}</p>}
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-center gap-4">
        {!submitted ? (
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Check my answers
          </button>
        ) : (
          <>
            <span className="font-semibold text-slate-900">
              You got {correct} of {questions.length} right.
            </span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw size={14} aria-hidden /> Try again
            </button>
          </>
        )}
        {!submitted && !allAnswered && <span className="text-sm text-slate-400">Answer every question to check.</span>}
        {bestScore !== undefined && (
          <span className="ml-auto text-sm text-slate-500">Best score: {Math.round(bestScore * 100)}%</span>
        )}
      </div>
    </div>
  )
}
