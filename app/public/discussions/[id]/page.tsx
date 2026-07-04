import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { EditorViewer } from '@/components/editor/Editor'
import { Comments } from '@/components/blog/Comments'
import { ReactionBar } from '@/components/blog/ReactionBar'
import { ReadingProgress } from '@/components/blog/ReadingProgress'
import { ContributorsPanel } from '@/components/discussions/ContributorsPanel'
import { InviteCoAuthor } from '@/components/discussions/InviteCoAuthor'
import { formatDate, getInitials } from '@/lib/utils'
import { Eye, Clock, Calendar, Pencil, Users } from 'lucide-react'
import type { Tag } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('title, excerpt')
    .eq('id', id)
    .single()
  if (!data) return { title: 'Discussion introuvable' }
  return { title: data.title, description: data.excerpt ?? undefined }
}

export default async function DiscussionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const current  = await getCurrentUser()

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, bio),
      post_tags(tag:tags(*)),
      post_authors(
        role,
        profile:profiles(id, username, display_name, avatar_url, bio)
      )
    `)
    .eq('id', id)
    .eq('type', 'discussion')
    .single()

  if (error || !post || post.status !== 'published') notFound()

  if (post.visibility === 'members' && !current) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-4">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-primary mb-2">Réservé aux membres</h2>
        <Link href={`/auth/login?redirect=/public/discussions/${id}`} className="btn-primary mt-4">
          Se connecter
        </Link>
      </div>
    )
  }

  // Compter les vues
  supabase.rpc('increment_post_views', { post_id: post.id }).then(() => {})

  const tags       = post.post_tags?.map((pt: any) => pt.tag).filter(Boolean) ?? []
  const coAuthors  = post.post_authors?.map((pa: any) => ({
    ...pa.profile,
    role: pa.role,
  })).filter((p: any) => p.id !== post.author?.id) ?? []
  const allAuthors = [{ ...post.author, role: 'author' }, ...coAuthors].filter(Boolean)

  const isOwner    = current?.profile?.id === post.author_id
  const isCoAuthor = coAuthors.some((a: any) => a.id === current?.profile?.id)
  const canEdit    = isOwner || isCoAuthor || current?.profile?.role === 'admin'

  // Réactions
  let userReaction: string | null = null
  const reactionCounts: Record<string, number> = {}
  if (current) {
    const { data: rx } = await supabase
      .from('reactions')
      .select('type')
      .eq('entity_type', 'post')
      .eq('entity_id', post.id)
      .eq('user_id', current.user.id)
      .single()
    userReaction = rx?.type ?? null
  }
  const { data: rxRows } = await supabase
    .from('reactions')
    .select('type')
    .eq('entity_type', 'post')
    .eq('entity_id', post.id)
  for (const r of rxRows ?? []) {
    reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1
  }

  return (
    <>
      <ReadingProgress />

      <article className="max-w-5xl mx-auto px-4 py-10">

        {/* ---- En-tête multi-auteurs ---- */}
        <header className="mb-10">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              Discussion
            </span>
            {tags.map((tag: Tag) => (
              <Link
                key={tag.id}
                href={`/public/discussions?tag=${tag.slug}`}
                className="badge-neutral hover:bg-surface-2 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>

          {/* Titre */}
          <h1 className="text-3xl md:text-4xl font-semibold text-primary tracking-tight leading-tight mb-4">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-lg text-secondary mb-6">{post.excerpt}</p>
          )}

          {/* Bandeau contributeurs */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 border-y border-border">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <Users size={14} />
                {allAuthors.length === 1
                  ? 'Discussion initiée par'
                  : `${allAuthors.length} voix —`
                }
              </span>
              <AvatarList profiles={allAuthors} />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted ml-auto">
              {post.published_at && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  {formatDate(post.published_at)}
                </span>
              )}
              {post.reading_time && (
                <span className="flex items-center gap-1">
                  <Clock size={13} />
                  {post.reading_time} min
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye size={13} />
                {post.views}
              </span>
              {canEdit && (
                <Link
                  href={`/private/discussions/${post.id}/edit`}
                  className="flex items-center gap-1 text-[rgb(var(--color-accent))] hover:underline"
                >
                  <Pencil size={13} />
                  Modifier
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Image de couverture */}
        {post.cover_image && (
          <div className="rounded-xl overflow-hidden mb-10">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full max-h-[400px] object-cover"
            />
          </div>
        )}

        {/* ---- Corps ---- */}
        <div className="flex gap-10 items-start">

          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            {post.content
              ? <EditorViewer content={post.content} />
              : <p className="text-muted italic">Aucun contenu.</p>
            }

            {/* Réactions */}
            <div className="mt-10 pt-6 border-t border-border">
              <ReactionBar
                postId={post.id}
                initialCounts={reactionCounts}
                initialUserReaction={userReaction}
                isLoggedIn={!!current}
              />
            </div>

            {/* Commentaires */}
            <div className="mt-12">
              <Comments
                postId={post.id}
                userId={current?.user.id ?? null}
                userProfile={current?.profile ?? null}
              />
            </div>
          </div>

          {/* ---- Sidebar contributeurs ---- */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20 space-y-4">
              <ContributorsPanel authors={allAuthors} />

              {/* Inviter un co-auteur (owner seulement) */}
              {isOwner && (
                <InviteCoAuthor
                  postId={post.id}
                  currentCoAuthorIds={coAuthors.map((a: any) => a.id)}
                />
              )}
            </div>
          </aside>
        </div>

        {/* Panneau contributeurs mobile */}
        <div className="lg:hidden mt-10 pt-8 border-t border-border">
          <ContributorsPanel authors={allAuthors} />
        </div>
      </article>
    </>
  )
}

function AvatarList({ profiles }: { profiles: any[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {profiles.map((p, i) => (
        <span key={p?.id ?? i} className="flex items-center gap-1.5">
          {p?.avatar_url
            ? <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            : (
              <span className="avatar-sm">
                {getInitials(p?.display_name ?? p?.username)}
              </span>
            )
          }
          <span className="text-sm text-primary">
            {p?.display_name ?? p?.username}
            {p?.role === 'author' && (
              <span className="text-muted text-xs ml-1">(initiateur)</span>
            )}
          </span>
          {i < profiles.length - 1 && <span className="text-muted">·</span>}
        </span>
      ))}
    </div>
  )
}
