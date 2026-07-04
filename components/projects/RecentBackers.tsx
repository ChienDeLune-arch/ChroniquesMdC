import { formatPrice, timeAgo, getInitials } from '@/lib/utils'
import { Heart } from 'lucide-react'

interface Contribution {
  id:            string
  amount:        number
  is_anonymous:  boolean
  message:       string | null
  created_at:    string
  contributor:   { username: string; display_name: string | null; avatar_url: string | null } | null
}

export function RecentBackers({ contributions }: { contributions: Contribution[] }) {
  if (!contributions?.length) return null

  const total = contributions.length
  const shown = contributions.slice(0, 8)

  return (
    <div>
      <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
        <Heart size={18} className="text-[rgb(var(--color-accent))]" />
        {total} soutien{total > 1 ? 's' : ''}
      </h2>

      <div className="space-y-3">
        {shown.map(c => {
          const name = c.is_anonymous
            ? 'Soutien anonyme'
            : (c.contributor?.display_name ?? c.contributor?.username ?? 'Anonyme')
          const avatar = c.is_anonymous ? null : c.contributor?.avatar_url

          return (
            <div key={c.id} className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                {avatar
                  ? <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  : (
                    <span className="avatar-sm">
                      {c.is_anonymous ? '?' : getInitials(name)}
                    </span>
                  )
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium text-primary">{name}</span>
                  <span className="text-sm font-semibold text-[rgb(var(--color-accent))]">
                    {formatPrice(c.amount, 'EUR')}
                  </span>
                  <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
                </div>
                {c.message && (
                  <p className="text-sm text-secondary mt-0.5 italic">« {c.message} »</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {total > shown.length && (
        <p className="text-sm text-muted mt-4 text-center">
          + {total - shown.length} autre{total - shown.length > 1 ? 's' : ''} contribution{total - shown.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
