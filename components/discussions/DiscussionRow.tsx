import Link from 'next/link'
import { timeAgo, getInitials } from '@/lib/utils'
import { MessageSquare, Eye, Users } from 'lucide-react'
import type { Post } from '@/lib/types'

interface DiscussionRowProps {
  discussion:    Post
  commentCount:  number
  index:         number
}

export function DiscussionRow({ discussion, commentCount, index }: DiscussionRowProps) {
  const tags       = (discussion as any).post_tags?.map((pt: any) => pt.tag).filter(Boolean) ?? []
  const coAuthors  = (discussion as any).post_authors?.map((pa: any) => pa.profile).filter(Boolean) ?? []
  const author     = discussion.author
  const allAuthors = [author, ...coAuthors].filter(Boolean)

  return (
    <Link
      href={`/public/discussions/${discussion.id}`}
      className="flex items-center gap-4 px-5 py-4 bg-surface-0 hover:bg-surface-1 transition-colors group"
    >
      {/* Avatars empilés */}
      <div className="flex-shrink-0">
        <AvatarStack profiles={allAuthors} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-medium text-primary group-hover:text-[rgb(var(--color-accent))] transition-colors line-clamp-1">
            {discussion.title}
          </h3>
        </div>

        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {/* Auteurs */}
          <span className="text-xs text-muted">
            {allAuthors.length === 1
              ? (author?.display_name ?? author?.username ?? 'Anonyme')
              : `${author?.display_name ?? author?.username} + ${allAuthors.length - 1} autre${allAuthors.length > 2 ? 's' : ''}`
            }
          </span>

          {/* Tags */}
          {tags.slice(0, 2).map((tag: any) => (
            <span
              key={tag.id}
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${tag.color}22`,
                color: tag.color,
              }}
            >
              #{tag.name}
            </span>
          ))}
        </div>

        {discussion.excerpt && (
          <p className="text-xs text-muted mt-1 line-clamp-1 hidden sm:block">
            {discussion.excerpt}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted">
        {allAuthors.length > 1 && (
          <span className="hidden md:flex items-center gap-1">
            <Users size={12} />
            {allAuthors.length}
          </span>
        )}
        <span className="hidden sm:flex items-center gap-1">
          <Eye size={12} />
          {discussion.views ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={12} />
          {commentCount}
        </span>
        <span className="hidden md:block text-right min-w-[56px]">
          {discussion.published_at ? timeAgo(discussion.published_at) : '—'}
        </span>
      </div>
    </Link>
  )
}

// ---- Avatars empilés ----
export function AvatarStack({
  profiles,
  max = 3,
  size = 'sm',
}: {
  profiles: any[]
  max?: number
  size?: 'sm' | 'md'
}) {
  const shown    = profiles.slice(0, max)
  const overflow = profiles.length - max
  const dim      = size === 'md' ? 32 : 24
  const cls      = size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]'
  const border   = 'ring-2 ring-surface-0'

  return (
    <div className="flex items-center" style={{ gap: size === 'md' ? '-6px' : '-4px' }}>
      <div className="flex" style={{ gap: `${dim * -0.3}px` }}>
        {shown.map((p, i) => (
          <span
            key={p?.id ?? i}
            className={`${cls} rounded-full ${border} bg-[rgb(var(--color-accent-light))] text-[rgb(var(--color-accent))] font-medium flex items-center justify-center flex-shrink-0 overflow-hidden`}
            style={{ zIndex: max - i }}
            title={p?.display_name ?? p?.username}
          >
            {p?.avatar_url
              ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              : getInitials(p?.display_name ?? p?.username)
            }
          </span>
        ))}
        {overflow > 0 && (
          <span
            className={`${cls} rounded-full ${border} bg-surface-2 text-muted font-medium flex items-center justify-center flex-shrink-0`}
            style={{ zIndex: 0 }}
          >
            +{overflow}
          </span>
        )}
      </div>
    </div>
  )
}
