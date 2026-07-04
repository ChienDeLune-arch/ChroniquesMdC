import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { EditorViewer } from '@/components/editor/Editor'
import { Comments } from '@/components/blog/Comments'
import { ReactionBar } from '@/components/blog/ReactionBar'
import { ReadingProgress } from '@/components/blog/ReadingProgress'
import { TableOfContents } from '@/components/blog/TableOfContents'
import { PostCard } from '@/components/blog/PostCard'
import { formatDate, formatDateTime, getInitials, timeAgo } from '@/lib/utils'
import { Clock, Eye, Calendar, Share2, Pencil } from 'lucide-react'
import Link from 'next/link'
import type { Post, Tag } from '@/lib/types'

interface Props {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('title, excerpt, cover_image')
    .eq('slug', slug)
    .single()

  if (!data) return { title: 'Article introuvable' }

  return {
    title: data.title,
    description: data.excerpt ?? undefined,
    openGraph: {
      title: data.title,
      description: data.excerpt ?? undefined,
      images: data.cover_image ? [data.cover_image] : [],
      type: 'article',
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const supabase  = await createClient()
  const current   = await getCurrentUser()

  // ---- Post ----
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
      post_tags(tag:tags(*)),
      post_authors(profile:profiles(id, username, display_name, avatar_url))
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !post) notFound()

  // Visibilité membres
  if (post.visibility === 'members' && !current) {
    return <PrivateGate slug={slug} />
  }
  if (post.visibility === 'private' && current?.profile?.id !== post.author_id && current?.profile?.role !== 'admin') {
    notFound()
  }

  // Incrémenter les vues (fire & forget)
  supabase.rpc('increment_post_views', { post_id: post.id }).then(() => {})

  const tags       = post.post_tags?.map((pt: any) => pt.tag).filter(Boolean) ?? []
  const coAuthors  = post.post_authors?.map((pa: any) => pa.profile).filter(Boolean) ?? []
  const isOwner    = current?.profile?.id === post.author_id || current?.profile?.role === 'admin'

  // ---- Réactions utilisateur ----
  let userReaction: string | null = null
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

  // ---- Comptes réactions ----
  const { data: reactionRows } = await supabase
    .from('reactions')
    .select('type')
    .eq('entity_type', 'post')
    .eq('entity_id', post.id)

  const reactionCounts = (reactionRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1
    return acc
  }, {})

  // ---- Articles liés (même tags) ----
  const tagIds = tags.map((t: any) => t.id)
  let related: Post[] = []
  if (tagIds.length) {
    const { data } = await supabase
      .from('posts')
      .select('id, title, slug, excerpt, cover_image, type, published_at, reading_time, author:profiles!posts_author_id_fkey(username, display_name, avatar_url), post_tags(tag:tags(id, name, slug, color))')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .neq('id', post.id)
      .limit(3)
    related = (data as Post[] | null) ?? []
  }

  return (
    <>
      <ReadingProgress />

      <article className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="max-w-3xl mx-auto mb-10">
          {/* Tags + type */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="badge-accent">
              {post.type === 'discussion' ? 'Discussion' : post.type === 'note' ? 'Note' : 'Article'}
            </span>
            {tags.map((tag: Tag) => (
              <Link
                key={tag.id}
                href={`/public/blog?tag=${tag.slug}`}
                className="badge-neutral hover:bg-surface-2 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>

          {/* Titre */}
          <h1 className="text-3xl md:text-4xl font-semibold text-primary tracking-tight leading-tight mb-5">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-lg text-secondary mb-6">{post.excerpt}</p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted pb-5 border-b border-border">
            <div className="flex items-center gap-2">
              <AuthorAvatar profile={post.author} />
              <span className="text-primary font-medium">
                {post.author?.display_name ?? post.author?.username}
              </span>
            </div>
            {coAuthors.length > 0 && (
              <span className="text-muted">
                + {coAuthors.map((a: any) => a.display_name ?? a.username).join(', ')}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {formatDate(post.published_at)}
              </span>
            )}
            {post.reading_time && (
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {post.reading_time} min de lecture
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye size={13} />
              {post.views} vue{post.views !== 1 ? 's' : ''}
            </span>

            {isOwner && (
              <Link
                href={`/private/editor/${post.id}`}
                className="ml-auto flex items-center gap-1.5 text-[rgb(var(--color-accent))] hover:underline"
              >
                <Pencil size={13} />
                Modifier
              </Link>
            )}
          </div>
        </header>

        {/* Image de couverture */}
        {post.cover_image && (
          <div className="max-w-4xl mx-auto mb-10 rounded-xl overflow-hidden">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full max-h-[480px] object-cover"
            />
          </div>
        )}

        {/* Layout : contenu + TOC */}
        <div className="flex gap-10 items-start">
          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {post.content ? (
              <EditorViewer content={post.content} className="max-w-none" />
            ) : (
              <p className="text-muted italic">Aucun contenu.</p>
            )}

            {/* Réactions */}
            <div className="mt-10 pt-6 border-t border-border">
              <ReactionBar
                postId={post.id}
                initialCounts={reactionCounts}
                initialUserReaction={userReaction}
                isLoggedIn={!!current}
              />
            </div>

            {/* Auteur — carte biographique */}
            {post.author && (
              <div className="mt-10 p-6 surface-card">
                <div className="flex items-start gap-4">
                  <AuthorAvatar profile={post.author} size="lg" />
                  <div>
                    <p className="font-semibold text-primary">
                      {post.author.display_name ?? post.author.username}
                    </p>
                    <p className="text-sm text-secondary mt-1">
                      {post.author.bio ?? 'Aucune biographie.'}
                    </p>
                    {post.author.website && (
                      <a
                        href={post.author.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[rgb(var(--color-accent))] hover:underline mt-1 inline-block"
                      >
                        {post.author.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Commentaires */}
            <div className="mt-12">
              <Comments
                postId={post.id}
                userId={current?.user.id ?? null}
                userProfile={current?.profile ?? null}
              />
            </div>
          </div>

          {/* Table des matières — desktop seulement */}
          {post.content && (
            <div className="hidden xl:block w-56 flex-shrink-0">
              <div className="sticky top-20">
                <TableOfContents content={post.content} />
              </div>
            </div>
          )}
        </div>

        {/* Articles liés */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border">
            <h2 className="text-xl font-semibold text-primary mb-6">Articles similaires</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          </section>
        )}
      </article>
    </>
  )
}

// ---- Composants locaux ----

function AuthorAvatar({ profile, size = 'sm' }: { profile: any; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-12 h-12 rounded-full object-cover flex-shrink-0' : 'w-7 h-7 rounded-full object-cover'
  const avCls = size === 'lg' ? 'avatar-lg' : 'avatar-sm'
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.display_name ?? profile.username} className={cls} />
  }
  return <span className={avCls}>{getInitials(profile?.display_name ?? profile?.username)}</span>
}

function PrivateGate({ slug }: { slug: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-24 px-4">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-primary mb-2">Contenu réservé aux membres</h2>
      <p className="text-secondary mb-6">Connecte-toi pour lire cet article.</p>
      <Link href={`/auth/login?redirect=/public/blog/${slug}`} className="btn-primary">
        Se connecter
      </Link>
    </div>
  )
}
