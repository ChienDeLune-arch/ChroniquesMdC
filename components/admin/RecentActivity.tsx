import Link from 'next/link'
import { timeAgo } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface ActivityItem {
  id: string; label: string; sub: string; date: string | null; href: string
}

export function RecentActivity({ title, items }: { title: string; items: ActivityItem[] }) {
  return (
    <div className="surface-card p-5">
      <h3 className="font-medium text-primary mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Aucun élément récent.</p>
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.id}>
              <Link href={item.href} className="flex items-center gap-3 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate group-hover:text-[rgb(var(--color-accent))] transition-colors">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted truncate">{item.sub}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-xs text-muted">
                  {item.date && <span>{timeAgo(item.date)}</span>}
                  <ChevronRight size={12} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
