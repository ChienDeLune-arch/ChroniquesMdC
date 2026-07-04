import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { Plus, Target } from 'lucide-react'
import type { Project } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Projets',
  description: 'Soutenez des projets et contribuez à leur réalisation.',
}

interface Props {
  searchParams: Promise<{ status?: string; sort?: string }>
}

const STATUS_OPTIONS = [
  { value: 'active',  label: 'En cours' },
  { value: 'funded',  label: 'Financés' },
  { value: 'all',     label: 'Tous' },
]

const SORT_OPTIONS = [
  { value: 'recent',  label: 'Récents' },
  { value: 'ending',  label: 'Se terminent bientôt' },
  { value: 'popular', label: 'Les plus financés' },
]

export default async function ProjectsPage({ searchParams }: Props) {
  const { status = 'active', sort = 'recent' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(`
      id, title, slug, short_desc, cover_image,
      goal_amount, current_amount, currency,
      status, ends_at, created_at,
      creator:profiles(id, username, display_name, avatar_url)
    `, { count: 'exact' })
    .eq('visibility', 'public')

  if (status !== 'all') query = query.eq('status', status)
  else query = query.in('status', ['active', 'funded', 'closed'])

  if (sort === 'ending') {
    query = query.not('ends_at', 'is', null).order('ends_at', { ascending: true })
  } else if (sort === 'popular') {
    query = query.order('current_amount', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: projects, count } = await query.limit(12)

  // Stats globales
  const { data: stats } = await supabase
    .from('projects')
    .select('current_amount, status')
    .eq('visibility', 'public')

  const totalRaised = stats?.reduce((s, p) => s + (p.current_amount ?? 0), 0) ?? 0
  const totalFunded = stats?.filter(p => p.status === 'funded').length ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-primary tracking-tight">Projets</h1>
          <p className="text-secondary mt-1">
            {(totalRaised / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} levés
            · {totalFunded} projet{totalFunded > 1 ? 's' : ''} financé{totalFunded > 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/private/projects/new" className="btn-primary btn-sm flex-shrink-0">
          <Plus size={15} />
          Nouveau projet
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Statut */}
        <div className="flex items-center gap-1 bg-surface-1 border border-border rounded-lg p-1">
          {STATUS_OPTIONS.map(opt => (
            <a
              key={opt.value}
              href={`/public/projects?status=${opt.value}&sort=${sort}`}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                status === opt.value
                  ? 'bg-surface-0 text-primary font-medium shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>

        {/* Tri */}
        <div className="flex items-center gap-1 bg-surface-1 border border-border rounded-lg p-1">
          {SORT_OPTIONS.map(opt => (
            <a
              key={opt.value}
              href={`/public/projects?status=${status}&sort=${opt.value}`}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                sort === opt.value
                  ? 'bg-surface-0 text-primary font-medium shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>

        <span className="text-sm text-muted ml-auto">{count ?? 0} projet{(count ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      {/* Grille */}
      {projects && projects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(projects as unknown as Project[]).map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Target size={40} className="mx-auto mb-4 text-muted opacity-40" />
          <p className="text-muted">Aucun projet {status !== 'all' ? `avec le statut « ${STATUS_OPTIONS.find(o => o.value === status)?.label} »` : ''} pour l'instant.</p>
          <Link href="/private/projects/new" className="btn-primary mt-4 inline-flex">
            Lancer un projet →
          </Link>
        </div>
      )}
    </div>
  )
}
