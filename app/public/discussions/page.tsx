import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DiscussionRow } from '@/components/discussions/DiscussionRow'
import { TagFilter } from '@/components/blog/TagFilter'
import { MessageSquare, TrendingUp, Clock, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Post, Tag } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Discussions',
  description: 'Réflexions collectives, débats et explorations à plusieurs voix.',
}

interface Props {
  searchParams: Promise<{ tag?: string; sort?: string; q?: string; page?: string }>
}

const PER_PAGE = 15

const SORT_OPTIONS = [
  { value: 'recent',   label: 'Récentes',  icon: Clock },
  { value: 'active',   label: 'Actives',   icon: MessageSquare },
  { value: 'trending', label: 'Tendance',  icon: TrendingUp },
]

export default async function DiscussionsPage({ searchParams }: Props) {
  const { tag, sort = 'recent', q, page: pageParam } = await searchParams
  const page   = Math.max(1, parseInt(pageParam ?? '1', 10))
  const offset = (page - 1) * PER_PAGE
  const supabase = await createClient()

  // ---- Tags ----
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name, slug, color')
    .order('name')

  // ---- Discussions ----
  let query = supabase
    .from('posts')
    .select(`
      id, title, slug, excerpt, type,
      published_at, updated_at, views, allow_comments,
      author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
      post_tags(tag:tags(id, name, slug, color)),
      post_authors(profile:profiles(id, username, display_name, avatar_url))
    `, { count: 'exact' })
    .eq('type', 'discussion')
    .eq('status', 'published')
    .eq('visibility', 'public')

  if (tag) {
    const { data: tagRow } = await supabase
      .from('tags').select('id').eq('slug', tag).single()
    if (tagRow) query = query.contains('post_tags', [{ tag_id: tagRow.id }])
  }

  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  // Tri
  if (sort === 'active') {
    query = query.order('updated_at', { ascending: false })
  } else {
    query = query.order('published_at', { ascending: false })
  }

  const { data: discussions, count } = await query.range(offset, offset + PER_PAGE - 1)

  // Compter les commentaires pour chaque discussion
  const ids = (discussions ?? []).map((d: any) => d.id)
  const commentCounts: Record<string, number> = {}
  if (ids.length) {
    const { data: counts } = await supabase
      .from('comments')
      .select('post_id')
      .in('post_id', ids)
      .eq('is_approved', true)
    for (const c of counts ?? []) {
      commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1
    }
  }

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-primary tracking-tight">Discussions</h1>
          <p className="text-secondary mt-1">
            Réflexions collectives · {count ?? 0} sujet{(count ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/private/discussions/new" className="btn-primary btn-sm flex-shrink-0">
          <Plus size={15} />
          Nouvelle discussion
        </Link>
      </div>

      {/* Barre de filtres */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {/* Tri */}
        <div className="flex items-center gap-1 bg-surface-1 border border-border rounded-lg p-1">
          {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
            <a
              key={value}
              href={buildUrl({ tag, q, sort: value, page: 1 })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                sort === value
                  ? 'bg-surface-0 text-primary font-medium shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Icon size={13} />
              {label}
            </a>
          ))}
        </div>

        {/* Recherche rapide */}
        <form action="/public/discussions" className="flex-1 min-w-0 max-w-xs">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher…"
            className="input text-sm py-2"
          />
          {tag && <input type="hidden" name="tag" value={tag} />}
          {sort !== 'recent' && <input type="hidden" name="sort" value={sort} />}
        </form>
      </div>

      {/* Tags */}
      <TagFilter tags={(tags as Tag[] | null) ?? []} activeSlug={tag} />

      {/* Liste */}
      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
        {!discussions?.length && (
          <div className="text-center py-16 text-muted">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucune discussion pour le moment.</p>
            <Link href="/private/discussions/new" className="text-[rgb(var(--color-accent))] hover:underline text-sm mt-2 inline-block">
              Lancer la première →
            </Link>
          </div>
        )}

        {(discussions as any[] | null)?.map((d, i) => (
          <DiscussionRow
            key={d.id}
            discussion={d as Post}
            commentCount={commentCounts[d.id] ?? 0}
            index={i}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {page > 1 && (
            <a href={buildUrl({ tag, q, sort, page: page - 1 })} className="btn-secondary btn-sm">
              ← Précédent
            </a>
          )}
          <span className="text-sm text-muted">Page {page} / {totalPages}</span>
          {page < totalPages && (
            <a href={buildUrl({ tag, q, sort, page: page + 1 })} className="btn-secondary btn-sm">
              Suivant →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function buildUrl({ tag, q, sort, page }: { tag?: string; q?: string; sort?: string; page: number }) {
  const p = new URLSearchParams()
  if (tag)  p.set('tag', tag)
  if (q)    p.set('q', q)
  if (sort && sort !== 'recent') p.set('sort', sort)
  if (page > 1) p.set('page', String(page))
  const qs = p.toString()
  return `/public/discussions${qs ? `?${qs}` : ''}`
}
