import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { PostCard } from '@/components/blog/PostCard'
import { formatDate, getInitials } from '@/lib/utils'
import { Globe, Calendar, FileText, MessageSquare, ExternalLink } from 'lucide-react'
import type { Post } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name, username, bio')
    .eq('username', username)
    .single()
  if (!data) return { title: 'Profil introuvable' }
  return {
    title: data.display_name ?? data.username,
    description: data.bio ?? undefined,
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const current  = await getCurrentUser()

  // Profil
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, website, role, is_verified, created_at')
    .eq('username', username)
    .single()

  if (error || !profile) notFound()

  const isOwner = current?.profile?.id === profile.id

  // Articles publiés
  const { data: posts, count: postCount } = await supabase
    .from('posts')
    .select(`
      id, title, slug, excerpt, cover_image, type,
      published_at, reading_time, views,
      author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
      post_tags!post_tags_post_id_fkey(tag:tags!post_tags_tag_id_fkey(id, name, slug, color))
    `, { count: 'exact' })
    .eq('author_id', profile.id)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })
    .limit(6)

  // Discussions co-auteur
  const { count: discussionCount } = await supabase
    .from('post_authors')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profile.id)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* Header profil */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">

        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.display_name ?? profile.username}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[rgb(var(--color-border))]" />
            : <span className="avatar-xl rounded-2xl w-20 h-20 text-2xl">
                {getInitials(profile.display_name ?? profile.username)}
              </span>
          }
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-[rgb(var(--color-primary))]"
                  style={{ fontFamily: 'var(--font-space)' }}>
                  {profile.display_name ?? profile.username}
                </h1>
                {profile.is_verified && (
                  <span className="badge-accent text-xs">✓ Vérifié</span>
                )}
                {profile.role === 'admin' && (
                  <span className="badge bg-violet-500/15 text-violet-400 text-xs">Admin</span>
                )}
              </div>
              <p className="text-[rgb(var(--color-muted))] text-sm mt-0.5">@{profile.username}</p>
            </div>

            {isOwner && (
              <Link href="/private/settings" className="btn-secondary btn-sm flex-shrink-0">
                Modifier le profil
              </Link>
            )}
          </div>

          {profile.bio && (
            <p className="text-[rgb(var(--color-secondary))] mt-3 leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-[rgb(var(--color-muted))]">
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[rgb(var(--color-accent))] transition-colors">
                <Globe size={14} />
                {profile.website.replace(/^https?:\/\//, '')}
                <ExternalLink size={11} />
              </a>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              Membre depuis {formatDate(profile.created_at, 'MMMM yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Articles" value={postCount ?? 0} icon={<FileText size={18} />} />
        <StatCard label="Discussions" value={discussionCount ?? 0} icon={<MessageSquare size={18} />} />
        <StatCard
          label="Vues totales"
          value={(posts as Post[] | null)?.reduce((s, p) => s + (p.views ?? 0), 0) ?? 0}
          icon={<span className="text-base">👁</span>}
        />
      </div>

      {/* Articles */}
      {posts && posts.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-[rgb(var(--color-primary))] mb-5"
            style={{ fontFamily: 'var(--font-space)' }}>
            Articles
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {(posts as unknown as Post[]).map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {(postCount ?? 0) > 6 && (
            <div className="text-center mt-6">
              <Link href={`/public/blog?author=${profile.username}`}
                className="btn-secondary btn-sm">
                Voir tous les articles →
              </Link>
            </div>
          )}
        </section>
      )}

      {!posts?.length && (
        <div className="text-center py-16 text-[rgb(var(--color-muted))]">
          <FileText size={32} className="mx-auto mb-3 opacity-20" />
          <p>Aucun article publié pour le moment.</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="surface-card p-4 flex items-center gap-3">
      <span className="text-[rgb(var(--color-accent))]">{icon}</span>
      <div>
        <p className="text-xl font-semibold text-[rgb(var(--color-primary))]">{value}</p>
        <p className="text-xs text-[rgb(var(--color-muted))]">{label}</p>
      </div>
    </div>
  )
}
