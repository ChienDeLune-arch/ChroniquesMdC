import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FileCard } from '@/components/files/FileCard'
import { Upload, Files } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Fichiers',
  description: 'Ressources téléchargeables — libres ou payantes.',
}

interface Props {
  searchParams: Promise<{ type?: string; price?: string; q?: string }>
}

const TYPE_FILTERS = [
  { value: 'all',       label: 'Tous' },
  { value: 'image',     label: 'Images' },
  { value: 'audio',     label: 'Audio' },
  { value: 'video',     label: 'Vidéo' },
  { value: 'document',  label: 'Documents' },
  { value: 'code',      label: 'Code' },
  { value: 'archive',   label: 'Archives' },
]

const PRICE_FILTERS = [
  { value: 'all',  label: 'Tous les prix' },
  { value: 'free', label: 'Gratuit' },
  { value: 'paid', label: 'Payant' },
]

// Catégoriser un mime_type
function mimeCategory(mime: string | null): string {
  if (!mime) return 'other'
  if (mime.startsWith('image/'))                           return 'image'
  if (mime.startsWith('audio/'))                           return 'audio'
  if (mime.startsWith('video/'))                           return 'video'
  if (mime === 'application/pdf' || mime.includes('word') || mime.includes('document')) return 'document'
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return 'archive'
  if (mime.includes('javascript') || mime.includes('json') || mime.startsWith('text/')) return 'code'
  return 'other'
}

export default async function FilesPage({ searchParams }: Props) {
  const { type = 'all', price = 'all', q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('files')
    .select(`
      id, title, description, file_name, file_size, mime_type,
      pricing_type, price, currency, cover_image,
      download_count, visibility, created_at,
      uploader:profiles(id, username, display_name, avatar_url),
      file_tags(tag:tags(id, name, slug, color))
    `, { count: 'exact' })
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })

  if (q) query = query.ilike('title', `%${q}%`)
  if (price === 'free') query = query.eq('pricing_type', 'free')
  if (price === 'paid') query = query.in('pricing_type', ['paid', 'pwyw'])

  const { data: files, count } = await query.limit(24)

  // Filtrer par type côté JS (mime_type stocké en DB)
  const filtered = type === 'all'
    ? files
    : (files ?? []).filter((f: any) => mimeCategory(f.mime_type) === type)

  // Stats
  const totalFree = (files ?? []).filter((f: any) => f.pricing_type === 'free').length
  const totalPaid = (files ?? []).filter((f: any) => f.pricing_type !== 'free').length

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-primary tracking-tight">Fichiers</h1>
          <p className="text-secondary mt-1">
            {count ?? 0} ressource{(count ?? 0) > 1 ? 's' : ''} · {totalFree} gratuite{totalFree > 1 ? 's' : ''} · {totalPaid} payante{totalPaid > 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/private/files/upload" className="btn-primary btn-sm">
          <Upload size={15} />
          Mettre en ligne
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Type */}
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map(f => (
            <a
              key={f.value}
              href={`/public/files?type=${f.value}&price=${price}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                type === f.value
                  ? 'bg-[rgb(var(--color-accent))] text-white border-transparent'
                  : 'border-border text-secondary hover:text-primary hover:border-[rgb(var(--color-border-strong))]'
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>

        <div className="h-6 w-px bg-border self-center hidden sm:block" />

        {/* Prix */}
        <div className="flex gap-1">
          {PRICE_FILTERS.map(f => (
            <a
              key={f.value}
              href={`/public/files?type=${type}&price=${f.value}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                price === f.value
                  ? 'border-[rgb(var(--color-accent))] bg-accent-light text-[rgb(var(--color-accent))] font-medium'
                  : 'border-border text-secondary hover:text-primary'
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>

        {/* Recherche */}
        <form action="/public/files" className="ml-auto">
          <input type="hidden" name="type"  value={type} />
          <input type="hidden" name="price" value={price} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher…"
            className="input text-sm py-2 w-52"
          />
        </form>
      </div>

      {/* Grille */}
      {filtered && filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {(filtered as any[]).map(file => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Files size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-muted">Aucun fichier trouvé.</p>
          <Link href="/private/files/upload" className="btn-primary mt-4 inline-flex">
            Mettre en ligne le premier →
          </Link>
        </div>
      )}
    </div>
  )
}
