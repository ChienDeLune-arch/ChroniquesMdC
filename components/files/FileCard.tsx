import Link from 'next/link'
import { formatFileSize, formatPrice, getInitials, timeAgo } from '@/lib/utils'
import { Download } from 'lucide-react'

// ---- Catégorie MIME → config visuelle ----
export const MIME_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  image:    { label: 'Image',    emoji: '🖼️',  bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400' },
  audio:    { label: 'Audio',    emoji: '🎵',  bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400' },
  video:    { label: 'Vidéo',    emoji: '🎬',  bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-400' },
  document: { label: 'Document', emoji: '📄',  bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-400' },
  code:     { label: 'Code',     emoji: '💻',  bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-400' },
  archive:  { label: 'Archive',  emoji: '📦',  bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  other:    { label: 'Fichier',  emoji: '📁',  bg: 'bg-surface-2',                        text: 'text-secondary' },
}

export function getMimeCategory(mime: string | null): string {
  if (!mime) return 'other'
  if (mime.startsWith('image/'))  return 'image'
  if (mime.startsWith('audio/'))  return 'audio'
  if (mime.startsWith('video/'))  return 'video'
  if (mime === 'application/pdf' || mime.includes('word') || mime.includes('document')) return 'document'
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('archive')) return 'archive'
  if (mime.includes('javascript') || mime.includes('json') || mime.startsWith('text/')) return 'code'
  return 'other'
}

interface FileCardProps {
  file: {
    id:             string
    title:          string
    description:    string | null
    file_name:      string
    file_size:      number
    mime_type:      string | null
    pricing_type:   string
    price:          number
    currency:       string
    cover_image:    string | null
    download_count: number
    created_at:     string
    uploader:       { username: string; display_name: string | null; avatar_url: string | null } | null
    file_tags?:     { tag: { name: string; color: string } }[]
  }
}

export function FileCard({ file }: FileCardProps) {
  const cat    = getMimeCategory(file.mime_type)
  const config = MIME_CONFIG[cat] ?? MIME_CONFIG.other
  const tags   = file.file_tags?.map(ft => ft.tag).filter(Boolean) ?? []

  return (
    <Link
      href={`/public/files/${file.id}`}
      className="group surface-card overflow-hidden flex flex-col hover:border-[rgb(var(--color-border-strong))] hover:shadow-sm transition-all"
    >
      {/* Thumbnail / Preview */}
      <div className={`h-36 flex items-center justify-center flex-shrink-0 relative ${
        file.cover_image ? '' : config.bg
      }`}>
        {file.cover_image ? (
          <img
            src={file.cover_image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-4xl select-none">{config.emoji}</span>
        )}

        {/* Badge prix */}
        <span className={`absolute top-2 right-2 badge font-semibold ${
          file.pricing_type === 'free'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : file.pricing_type === 'pwyw'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-[rgb(var(--color-accent)/0.12)] text-[rgb(var(--color-accent))]'
        }`}>
          {file.pricing_type === 'free'
            ? 'Gratuit'
            : file.pricing_type === 'pwyw'
            ? 'Libre'
            : formatPrice(file.price, file.currency)}
        </span>

        {/* Type badge */}
        <span className={`absolute top-2 left-2 badge text-xs ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>

      {/* Infos */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-medium text-primary mb-1 line-clamp-2 group-hover:text-[rgb(var(--color-accent))] transition-colors">
          {file.title}
        </h3>

        {file.description && (
          <p className="text-xs text-secondary line-clamp-2 mb-2">{file.description}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 2).map((tag: any, i: number) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tag.color}22`, color: tag.color }}>
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Méta */}
        <div className="mt-auto pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted">
          <span>{formatFileSize(file.file_size)}</span>
          <span className="flex items-center gap-1">
            <Download size={11} />
            {file.download_count}
          </span>
        </div>
      </div>
    </Link>
  )
}
