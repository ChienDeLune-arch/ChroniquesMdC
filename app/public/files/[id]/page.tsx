import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { FilePreview } from '@/components/files/FilePreview'
import { DownloadButton } from '@/components/files/DownloadButton'
import { getMimeCategory, MIME_CONFIG } from '@/components/files/FileCard'
import { formatFileSize, formatPrice, formatDate, getInitials, timeAgo } from '@/lib/utils'
import { Download, Calendar, Tag, Lock } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('files').select('title, description').eq('id', id).single()
  if (!data) return { title: 'Fichier introuvable' }
  return { title: data.title, description: data.description ?? undefined }
}

export default async function FileDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const current  = await getCurrentUser()

  const { data: file, error } = await supabase
    .from('files')
    .select(`
      *,
      uploader:profiles(id, username, display_name, avatar_url, bio),
      file_tags(tag:tags(id, name, slug, color))
    `)
    .eq('id', id)
    .single()

  if (error || !file) notFound()

  // Visibilité
  if (file.visibility === 'private' && current?.profile?.id !== file.uploader_id) notFound()
  if (file.visibility === 'members' && !current) {
    return <MembersGate id={id} />
  }

  // A-t-il déjà acheté ?
  let hasPurchased = false
  if (current && file.pricing_type !== 'free') {
    const { data: purchase } = await supabase
      .from('file_purchases')
      .select('id')
      .eq('file_id', id)
      .eq('buyer_id', current.user.id)
      .single()
    hasPurchased = !!purchase
  }

  const cat    = getMimeCategory(file.mime_type)
  const config = MIME_CONFIG[cat] ?? MIME_CONFIG.other
  const tags   = file.file_tags?.map((ft: any) => ft.tag).filter(Boolean) ?? []
  const isOwner = current?.profile?.id === file.uploader_id || current?.profile?.role === 'admin'

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex gap-8 items-start">

        {/* ---- Colonne principale ---- */}
        <div className="flex-1 min-w-0">

          {/* Preview */}
          <div className="mb-6">
            <FilePreview
              fileId={file.id}
              mimeType={file.mime_type}
              title={file.title}
              coverImage={file.cover_image}
              isPubliclyPreviewable={
                file.pricing_type === 'free' ||
                hasPurchased ||
                isOwner
              }
            />
          </div>

          {/* Titre + méta */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge text-xs ${config.bg} ${config.text}`}>
                    {config.emoji} {config.label}
                  </span>
                  {file.visibility !== 'public' && (
                    <span className="badge-neutral text-xs flex items-center gap-1">
                      <Lock size={10} />
                      {file.visibility === 'members' ? 'Membres' : 'Privé'}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-semibold text-primary">{file.title}</h1>
              </div>

              {isOwner && (
                <Link href={`/private/files/${file.id}/edit`} className="btn-secondary btn-sm flex-shrink-0">
                  Modifier
                </Link>
              )}
            </div>

            {file.description && (
              <p className="text-secondary">{file.description}</p>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Tag size={14} className="text-muted self-center" />
              {tags.map((tag: any) => (
                <Link
                  key={tag.id}
                  href={`/public/files?tag=${tag.slug}`}
                  className="badge-neutral hover:bg-surface-2 transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Uploader */}
          {file.uploader && (
            <div className="surface-card p-4 flex items-start gap-3">
              {file.uploader.avatar_url
                ? <img src={file.uploader.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                : <span className="avatar-lg flex-shrink-0">{getInitials(file.uploader.display_name ?? file.uploader.username)}</span>
              }
              <div>
                <p className="font-medium text-primary text-sm">
                  {file.uploader.display_name ?? file.uploader.username}
                </p>
                {file.uploader.bio && (
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">{file.uploader.bio}</p>
                )}
              </div>
              <span className="ml-auto text-xs text-muted flex items-center gap-1 flex-shrink-0">
                <Calendar size={12} />
                {formatDate(file.created_at)}
              </span>
            </div>
          )}
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="w-64 flex-shrink-0 hidden md:block">
          <div className="sticky top-20 space-y-4">

            {/* Carte de téléchargement */}
            <div className="surface-card p-5 space-y-4">
              {/* Prix */}
              <div className="text-center">
                {file.pricing_type === 'free' ? (
                  <span className="text-2xl font-semibold text-green-600">Gratuit</span>
                ) : file.pricing_type === 'pwyw' ? (
                  <div>
                    <span className="text-2xl font-semibold text-primary">Prix libre</span>
                    {file.price > 0 && (
                      <p className="text-xs text-muted mt-0.5">
                        Minimum : {formatPrice(file.price, file.currency)}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-2xl font-semibold text-[rgb(var(--color-accent))]">
                    {formatPrice(file.price, file.currency)}
                  </span>
                )}
              </div>

              <DownloadButton
                fileId={file.id}
                pricingType={file.pricing_type}
                price={file.price}
                currency={file.currency}
                hasPurchased={hasPurchased}
                isLoggedIn={!!current}
                isOwner={isOwner}
              />
            </div>

            {/* Infos fichier */}
            <div className="surface-card p-4 space-y-2.5 text-sm">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Détails</h3>
              <InfoRow label="Nom"    value={file.file_name} mono />
              <InfoRow label="Taille" value={formatFileSize(file.file_size)} />
              <InfoRow label="Type"   value={file.mime_type ?? '—'} mono />
              <InfoRow
                label="Téléchargements"
                value={
                  <span className="flex items-center gap-1">
                    <Download size={13} className="text-muted" />
                    {file.download_count}
                  </span>
                }
              />
              <InfoRow label="Mis en ligne" value={timeAgo(file.created_at)} />
            </div>
          </div>
        </aside>
      </div>

      {/* Sidebar mobile */}
      <div className="md:hidden mt-8 border-t border-border pt-6 space-y-4">
        <DownloadButton
          fileId={file.id}
          pricingType={file.pricing_type}
          price={file.price}
          currency={file.currency}
          hasPurchased={hasPurchased}
          isLoggedIn={!!current}
          isOwner={isOwner}
        />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow label="Taille" value={formatFileSize(file.file_size)} />
          <InfoRow label="Téléchargements" value={String(file.download_count)} />
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label, value, mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted text-xs">{label}</span>
      <span className={`text-primary text-xs truncate max-w-[60%] ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function MembersGate({ id }: { id: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-24 px-4">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-primary mb-2">Réservé aux membres</h2>
      <p className="text-secondary mb-6">Connecte-toi pour accéder à ce fichier.</p>
      <Link href={`/auth/login?redirect=/public/files/${id}`} className="btn-primary">Se connecter</Link>
    </div>
  )
}
