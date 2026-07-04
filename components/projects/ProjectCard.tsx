import Link from 'next/link'
import { getProgressPct, formatPrice, getInitials } from '@/lib/utils'
import { Clock, Users } from 'lucide-react'
import type { Project } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  funded:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  closed:    'bg-surface-2 text-muted',
  cancelled: 'bg-red-100 text-red-700',
  draft:     'bg-amber-100 text-amber-800',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'En cours', funded: 'Financé', closed: 'Terminé', cancelled: 'Annulé', draft: 'Brouillon',
}

export function ProjectCard({ project }: { project: Project }) {
  const pct      = getProgressPct(project.current_amount, project.goal_amount)
  const creator  = project.creator
  const daysLeft = project.ends_at
    ? Math.max(0, Math.ceil((new Date(project.ends_at).getTime() - Date.now()) / 86_400_000))
    : null

  // Couleur de la barre selon avancement
  const barColor = pct >= 100
    ? 'bg-green-500'
    : pct >= 50
    ? 'bg-[rgb(var(--color-accent))]'
    : 'bg-amber-500'

  return (
    <Link
      href={`/public/projects/${project.slug}`}
      className="group surface-card overflow-hidden flex flex-col hover:border-[rgb(var(--color-border-strong))] hover:shadow-sm transition-all"
    >
      {/* Image */}
      <div className="h-44 bg-surface-2 overflow-hidden flex-shrink-0 relative">
        {project.cover_image ? (
          <img
            src={project.cover_image}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ProjectGradient title={project.title} />
        )}
        {/* Badge statut */}
        <span className={`absolute top-3 left-3 badge ${STATUS_STYLES[project.status] ?? 'badge-neutral'}`}>
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
        {/* Jours restants */}
        {daysLeft !== null && project.status === 'active' && (
          <span className="absolute top-3 right-3 badge bg-black/60 text-white backdrop-blur-sm">
            <Clock size={10} />
            {daysLeft === 0 ? 'Dernier jour' : `${daysLeft}j`}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-primary mb-2 line-clamp-2 group-hover:text-[rgb(var(--color-accent))] transition-colors">
          {project.title}
        </h3>

        {project.short_desc && (
          <p className="text-sm text-secondary line-clamp-2 mb-4">{project.short_desc}</p>
        )}

        {/* Barre de progression */}
        <div className="mt-auto">
          <div className="progress-bar mb-2">
            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-semibold text-primary">
                {formatPrice(project.current_amount, project.currency)}
              </span>
              <span className="text-muted text-xs ml-1">
                / {formatPrice(project.goal_amount, project.currency)}
              </span>
            </div>
            <span className={`font-semibold text-sm ${pct >= 100 ? 'text-green-600' : 'text-[rgb(var(--color-accent))]'}`}>
              {pct}%
            </span>
          </div>

          {/* Créateur */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            {creator?.avatar_url
              ? <img src={creator.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              : <span className="avatar-sm !w-5 !h-5 text-[9px]">{getInitials(creator?.display_name ?? creator?.username)}</span>
            }
            <span className="text-xs text-muted">
              {creator?.display_name ?? creator?.username ?? 'Anonyme'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function ProjectGradient({ title }: { title: string }) {
  const hue = (title.charCodeAt(0) * 11 + 120) % 360
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, hsl(${hue},55%,85%) 0%, hsl(${(hue+50)%360},45%,90%) 100%)` }}
    >
      <span className="text-3xl opacity-40">🎯</span>
    </div>
  )
}
