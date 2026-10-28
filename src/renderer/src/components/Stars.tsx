import { Star } from 'lucide-react'

export function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden
          className={i <= count ? 'fill-amber-400 text-amber-400' : 'fill-none text-slate-300'}
        />
      ))}
    </span>
  )
}
