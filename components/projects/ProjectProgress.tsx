import { getProgressPct, formatPrice } from '@/lib/utils'
import { Users, Clock, CheckCircle2 } from 'lucide-react'

interface ProjectProgressProps {
  current:  number
  goal:     number
  currency: string
  backers:  number
  endsAt:   string | null
  status:   string
}

export function ProjectProgress({ current, goal, currency, backers, endsAt, status }: ProjectProgressProps) {
  const pct = getProgressPct(current, goal)

  const daysLeft = endsAt
    ? Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000))
    : null

  const barColor = pct >= 100
    ? 'bg-green-500'
    : pct >= 75
    ? 'bg-emerald-500'
    : pct >= 50
    ? 'bg-[rgb(var(--color-accent))]'
    : 'bg-amber-500'

  return (
    <div className="surface-card p-6">
      {/* Barre principale */}
      <div className="mb-2">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-2xl font-semibold text-primary">
            {formatPrice(current, currency)}
          </span>
          <span className={`text-lg font-semibold ${pct >= 100 ? 'text-green-600' : 'text-[rgb(var(--color-accent))]'}`}>
            {pct}%
          </span>
        </div>
        <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="text-sm text-muted mt-1.5">
          sur {formatPrice(goal, currency)} visés
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border">
        <Stat
          value={backers.toString()}
          label={`soutien${backers > 1 ? 's' : ''}`}
          icon={<Users size={16} />}
        />

        {daysLeft !== null ? (
          <Stat
            value={daysLeft === 0 ? 'Aujourd\'hui' : `${daysLeft}j`}
            label={daysLeft === 0 ? 'dernier jour' : 'restants'}
            icon={<Clock size={16} />}
            highlight={daysLeft <= 3 && status === 'active'}
          />
        ) : (
          <Stat
            value="∞"
            label="pas de limite"
            icon={<Clock size={16} />}
          />
        )}

        <Stat
          value={pct >= 100 ? 'Objectif' : `${100 - pct}%`}
          label={pct >= 100 ? 'atteint !' : 'restant'}
          icon={<CheckCircle2 size={16} />}
          success={pct >= 100}
        />
      </div>
    </div>
  )
}

function Stat({
  value, label, icon, highlight = false, success = false,
}: {
  value:      string
  label:      string
  icon:       React.ReactNode
  highlight?: boolean
  success?:   boolean
}) {
  return (
    <div className="text-center">
      <div className={`flex justify-center mb-1 ${success ? 'text-green-600' : highlight ? 'text-amber-600' : 'text-muted'}`}>
        {icon}
      </div>
      <p className={`text-xl font-semibold ${success ? 'text-green-600' : highlight ? 'text-amber-600' : 'text-primary'}`}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
