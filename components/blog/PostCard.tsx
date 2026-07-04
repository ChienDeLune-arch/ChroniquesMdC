import Link from 'next/link'
import { formatDate, getInitials, cn } from '@/lib/utils'
import { Clock, Eye } from 'lucide-react'
import type { Post } from '@/lib/types'

interface PostCardProps {
  post: Post
  featured?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  blog:        'Article',
  discussion:  'Discussion',
  note:        'Note',
}

export function PostCard({ post, featured = false }: PostCardProps) {
  const tags    = post.tags?.map((pt: any) => pt.tag).filter(Boolean) ?? []
  const author  = post.author

  if (featured) {
    return (
      <Link
        href={`/public/blog/${post.slug}`}
        className="group grid md:grid-cols-5 gap-0 surface-card overflow-hidden hover:border-[rgb(var(--color-border-strong))] transition-all"
      >
        {/* Image */}
        <div className="md:col-span-3 h-56 md:h-auto bg-surface-2 overflow-hidden">
          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <GradientPlaceholder title={post.title} />
          )}
        </div>

        {/* Contenu */}
        <div className="md:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-accent">{TYPE_LABELS[post.type] ?? 'Article'}</span>
              {post.is_featured && (
                <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  À la une
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-primary mb-3 group-hover:text-[rgb(var(--color-accent))] transition-colors line-clamp-3">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="text-secondary text-sm line-clamp-3">{post.excerpt}</p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.slice(0, 3).map((tag: any) => (
                  <span key={tag.id} className="badge-neutral text-xs">#{tag.name}</span>
                ))}
              </div>
            )}
            <AuthorMeta post={post} />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/public/blog/${post.slug}`}
      className="group surface-card overflow-hidden flex flex-col hover:border-[rgb(var(--color-border-strong))] hover:shadow-sm transition-all"
    >
      {/* Image */}
      <div className="h-44 bg-surface-2 overflow-hidden flex-shrink-0">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <GradientPlaceholder title={post.title} />
        )}
      </div>

      {/* Contenu */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="badge-accent">{TYPE_LABELS[post.type] ?? 'Article'}</span>
        </div>

        <h2 className="font-semibold text-primary mb-2 group-hover:text-[rgb(var(--color-accent))] transition-colors line-clamp-2">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-sm text-secondary line-clamp-2 mb-3">{post.excerpt}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 2).map((tag: any) => (
              <span key={tag.id} className="badge-neutral text-xs">#{tag.name}</span>
            ))}
            {tags.length > 2 && (
              <span className="badge-neutral text-xs">+{tags.length - 2}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-border">
          <AuthorMeta post={post} />
        </div>
      </div>
    </Link>
  )
}

function AuthorMeta({ post }: { post: Post }) {
  const author = post.author
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {author?.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.display_name ?? author.username}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <span className="avatar-sm text-[10px]">
            {getInitials(author?.display_name ?? author?.username)}
          </span>
        )}
        <span className="text-xs text-secondary">
          {author?.display_name ?? author?.username ?? 'Anonyme'}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted">
        {post.reading_time && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {post.reading_time} min
          </span>
        )}
        {post.published_at && (
          <span>{formatDate(post.published_at, 'd MMM yyyy')}</span>
        )}
      </div>
    </div>
  )
}

function GradientPlaceholder({ title }: { title: string }) {
  // Couleur dérivée du titre (deterministe)
  const hue = title.charCodeAt(0) * 7 % 360
  return (
    <div
      className="w-full h-full flex items-end p-4"
      style={{ background: `linear-gradient(135deg, hsl(${hue},60%,88%) 0%, hsl(${(hue+40)%360},50%,92%) 100%)` }}
    >
      <span className="text-xs font-medium" style={{ color: `hsl(${hue},50%,35%)` }}>
        {title.slice(0, 40)}
      </span>
    </div>
  )
}
