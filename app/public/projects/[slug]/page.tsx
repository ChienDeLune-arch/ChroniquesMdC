import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { EditorViewer } from '@/components/editor/Editor'
import { ProjectProgress } from '@/components/projects/ProjectProgress'
import { TierCard } from '@/components/projects/TierCard'
import { RecentBackers } from '@/components/projects/RecentBackers'
import { ContributeModal } from '@/components/projects/ContributeModal'
import { formatDate, getInitials } from '@/lib/utils'
import { Pencil, Share2 } from 'lucide-react'
import type { ProjectTier } from '@/lib/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase  = await createClient()
  const { data }  = await supabase.from('projects').select('title, short_desc, cover_image').eq('slug', slug).single()
  if (!data) return { title: 'Projet introuvable' }
  return {
    title: data.title,
    description: data.short_desc ?? undefined,
    openGraph: { images: data.cover_image ? [data.cover_image] : [] },
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase  = await createClient()
  const current   = await getCurrentUser()

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      creator:profiles(id, username, display_name, avatar_url, bio),
      project_tiers(id, title, description, amount, max_backers, stripe_price_id, created_at)
    `)
    .eq('slug', slug)
    .single()

  if (error || !project || (project.visibility === 'private' && current?.profile?.id !== project.creator_id)) {
    notFound()
  }

  const isOwner = current?.profile?.id === project.creator_id || current?.profile?.role === 'admin'

  // Nombre de backers par palier
  const { data: contributions } = await supabase
    .from('project_contributions')
    .select('tier_id, contributor_id, amount, is_anonymous, created_at, contributor:profiles(username, display_name, avatar_url)')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const backersByTier: Record<string, number> = {}
  for (const c of contributions ?? []) {
    if (c.tier_id) backersByTier[c.tier_id] = (backersByTier[c.tier_id] ?? 0) + 1
  }

  const tiers = (project.project_tiers ?? [])
    .sort((a: any, b: any) => a.amount - b.amount)
    .map((t: any) => ({ ...t, backers_count: backersByTier[t.id] ?? 0 }))

  const totalBackers = new Set((contributions ?? []).map((c: any) => c.contributor_id)).size

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Hero */}
      {project.cover_image && (
        <div className="rounded-2xl overflow-hidden mb-8 max-h-80">
          <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={project.status} />
          </div>
          <h1 className="text-3xl font-semibold text-primary tracking-tight">{project.title}</h1>
          {project.short_desc && (
            <p className="text-lg text-secondary mt-2">{project.short_desc}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ShareButton title={project.title} />
          {isOwner && (
            <Link href={`/private/projects/${project.id}/edit`} className="btn-secondary btn-sm">
              <Pencil size={14} />Modifier
            </Link>
          )}
        </div>
      </div>

      {/* Progression */}
      <ProjectProgress
        current={project.current_amount}
        goal={project.goal_amount}
        currency={project.currency}
        backers={totalBackers}
        endsAt={project.ends_at}
        status={project.status}
      />

      {/* Corps */}
      <div className="mt-10 flex gap-8 items-start">

        {/* Contenu gauche */}
        <div className="flex-1 min-w-0">
          {/* Créateur */}
          <div className="flex items-center gap-3 mb-8 p-4 surface-card">
            {project.creator?.avatar_url
              ? <img src={project.creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <span className="avatar-lg">{getInitials(project.creator?.display_name ?? project.creator?.username)}</span>
            }
            <div>
              <p className="text-sm font-medium text-primary">
                {project.creator?.display_name ?? project.creator?.username}
              </p>
              {project.creator?.bio && (
                <p className="text-xs text-muted line-clamp-1">{project.creator.bio}</p>
              )}
            </div>
            <span className="ml-auto text-xs text-muted">
              Lancé le {formatDate(project.created_at)}
            </span>
          </div>

          {/* Description */}
          {project.content
            ? <EditorViewer content={project.content} />
            : project.short_desc && <p className="text-secondary">{project.short_desc}</p>
          }

          {/* Backers récents */}
          <div className="mt-10">
            <RecentBackers contributions={contributions as any[]} />
          </div>
        </div>

        {/* Sidebar tiers */}
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-3">
            {tiers.length > 0 ? (
              <>
                <p className="text-xs font-medium text-muted uppercase tracking-widest mb-2">
                  Choisir un palier
                </p>
                {tiers.map((tier: ProjectTier & { backers_count: number }) => (
                  <TierCard
                    key={tier.id}
                    tier={tier}
                    currency={project.currency}
                    projectId={project.id}
                    projectStatus={project.status}
                    isLoggedIn={!!current}
                  />
                ))}
              </>
            ) : null}

            {/* Contribution libre */}
            {project.status === 'active' && (
              <ContributeModal
                projectId={project.id}
                projectTitle={project.title}
                currency={project.currency}
                minAmount={100}
                isLoggedIn={!!current}
              />
            )}

            {project.status !== 'active' && (
              <div className="surface-card p-4 text-center text-sm text-muted">
                {project.status === 'funded'
                  ? '🎉 Ce projet a atteint son objectif !'
                  : 'Ce projet n\'accepte plus de contributions.'}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Tiers mobile */}
      {tiers.length > 0 && (
        <div className="lg:hidden mt-10 pt-8 border-t border-border space-y-3">
          <h2 className="font-semibold text-primary mb-4">Choisir un palier</h2>
          {tiers.map((tier: ProjectTier & { backers_count: number }) => (
            <TierCard
              key={tier.id}
              tier={tier}
              currency={project.currency}
              projectId={project.id}
              projectStatus={project.status}
              isLoggedIn={!!current}
            />
          ))}
          {project.status === 'active' && (
            <ContributeModal
              projectId={project.id}
              projectTitle={project.title}
              currency={project.currency}
              minAmount={100}
              isLoggedIn={!!current}
            />
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'badge bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    funded:    'badge bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    closed:    'badge-neutral',
    cancelled: 'badge-danger',
    draft:     'badge bg-amber-100 text-amber-800',
  }
  const labels: Record<string, string> = {
    active: 'En cours', funded: 'Financé', closed: 'Terminé', cancelled: 'Annulé', draft: 'Brouillon',
  }
  return <span className={map[status] ?? 'badge-neutral'}>{labels[status] ?? status}</span>
}

function ShareButton({ title }: { title: string }) {
  return (
    <button
      onClick={() => {
        if (navigator.share) {
          navigator.share({ title, url: location.href })
        } else {
          navigator.clipboard.writeText(location.href)
        }
      }}
      className="btn-ghost btn-sm"
    >
      <Share2 size={14} />
      Partager
    </button>
  )
}
