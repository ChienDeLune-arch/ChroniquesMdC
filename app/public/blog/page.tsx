import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { TagFilter } from '@/components/blog/TagFilter'
import { PostCard } from '@/components/blog/PostCard'
import { Rss } from 'lucide-react'
import type { Post, Tag } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Articles, réflexions et explorations.',
}

interface Props {
  searchParams: Promise<{ tag?: string; q?: string; page?: string }>
}

const PER_PAGE = 9

export default async function BlogPage({ searchParams }: Props) {
  const { tag, q, page: pageParam } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1', 10))
  const offset  = (page - 1) * PER_PAGE
  const supabase = await createClient()

	const { data, error } = await supabase
  .from('posts')
    .select(`
	  id, title, slug, excerpt, cover_image, type,
	  published_at, reading_time, is_featured, views,
	  author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
	  post_tags!post_tags_post_id_fkey(tag:tags!post_tags_tag_id_fkey(id, name, slug, color))
	`, { count: 'exact' })
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })

console.log('ALL posts:', JSON.stringify(data))
  // Tags disponibles
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name, slug, color')
    .order('name')

  // Posts
  let query = supabase
    .from('posts')
    .select(`
      id, title, slug, excerpt, cover_image, type,
      published_at, reading_time, is_featured, views,
      author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
      post_tags(tag:tags(id, name, slug, color))
    `, { count: 'exact' })
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })

  if (tag) {
    const { data: tagRow } = await supabase
      .from('tags').select('id').eq('slug', tag).single()
    if (tagRow) {
      query = query.contains('post_tags', [{ tag_id: tagRow.id }])
    }
  }

  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data: posts, count } = await query.range(offset, offset + PER_PAGE - 1)
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  const featured = !tag && !q && page === 1
    ? (posts as Post[] | null)?.[0]
    : null
  const gridPosts = featured
    ? (posts as Post[] | null)?.slice(1)
    : (posts as Post[] | null)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-primary tracking-tight">Blog</h1>
          <p className="text-secondary mt-1">
            {count ?? 0} article{(count ?? 0) !== 1 ? 's' : ''}
            {tag ? ` · #${tag}` : ''}
          </p>
        </div>
        <a href="/api/feed.xml"
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-[rgb(var(--color-accent))] transition-colors"
          aria-label="Flux RSS">
          <Rss size={16} />
          <span className="hidden sm:inline">RSS</span>
        </a>
      </div>

      <Suspense fallback={null}>
        <TagFilter tags={(tags as Tag[] | null) ?? []} activeSlug={tag} />
      </Suspense>

      {featured && (
        <div className="mb-10">
          <PostCard post={featured as Post} featured />
        </div>
      )}

      {gridPosts && gridPosts.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(gridPosts as Post[]).map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted">
          <p className="text-lg">Aucun article pour le moment.</p>
          {(tag || q) && (
            <a href="/public/blog" className="text-sm text-[rgb(var(--color-accent))] underline mt-2 inline-block">
              Voir tous les articles
            </a>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12">
          {page > 1 && (
            <a href={buildUrl({ tag, q, page: page - 1 })} className="btn-secondary btn-sm">
              ← Précédent
            </a>
          )}
          <span className="text-sm text-muted px-3">Page {page} / {totalPages}</span>
          {page < totalPages && (
            <a href={buildUrl({ tag, q, page: page + 1 })} className="btn-secondary btn-sm">
              Suivant →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function buildUrl({ tag, q, page }: { tag?: string; q?: string; page: number }) {
  const params = new URLSearchParams()
  if (tag) params.set('tag', tag)
  if (q)   params.set('q', q)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return `/public/blog${qs ? `?${qs}` : ''}`
}
