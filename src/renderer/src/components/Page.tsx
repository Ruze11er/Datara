import type { ReactNode } from 'react'

export function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
      </header>
      {children}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>{children}</section>
}

/** Placeholder for sections that are planned but not built yet. */
export function ComingSoon({ phase, items }: { phase: string; items: string[] }) {
  return (
    <Card>
      <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
        Coming in {phase}
      </span>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  )
}
