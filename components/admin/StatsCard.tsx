// ---- StatsCard ----
const COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pink:   'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
}

export function StatsCard({ label, value, sub, icon, color = 'blue' }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color?: string
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`p-2 rounded-lg ${COLOR_MAP[color] ?? COLOR_MAP.blue}`}>{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-primary">{value}</p>
      <p className="text-sm text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  )
}
