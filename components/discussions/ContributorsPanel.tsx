import { getInitials } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

interface Author {
  id:           string
  username:     string
  display_name: string | null
  avatar_url:   string | null
  bio:          string | null
  website?:     string | null
  role?:        string
}

export function ContributorsPanel({ authors }: { authors: Author[] }) {
  if (!authors.length) return null

  return (
    <div className="surface-card p-4">
      <h3 className="text-xs font-medium text-muted uppercase tracking-widest mb-4">
        Contributeur{authors.length > 1 ? 's' : ''}
      </h3>

      <div className="space-y-4">
        {authors.map((author, i) => (
          <div key={author.id ?? i} className="flex gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {author.avatar_url
                ? <img
                    src={author.avatar_url}
                    alt={author.display_name ?? author.username}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                : <span className="avatar-md">
                    {getInitials(author.display_name ?? author.username)}
                  </span>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-medium text-primary truncate">
                  {author.display_name ?? author.username}
                </span>
                {author.role === 'author' && (
                  <span className="text-xs text-muted flex-shrink-0">initiateur</span>
                )}
              </div>
              <p className="text-xs text-muted">@{author.username}</p>
              {author.bio && (
                <p className="text-xs text-secondary mt-1 line-clamp-2">{author.bio}</p>
              )}
              {author.website && (
                <a
                  href={author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-xs text-[rgb(var(--color-accent))] hover:underline mt-1"
                >
                  <ExternalLink size={10} />
                  {author.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
