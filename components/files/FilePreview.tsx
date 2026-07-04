'use client'

import { getMimeCategory } from './FileCard'

interface FilePreviewProps {
  fileId:                  string
  mimeType:                string | null
  title:                   string
  coverImage:              string | null
  isPubliclyPreviewable:   boolean
}

export function FilePreview({
  fileId, mimeType, title, coverImage, isPubliclyPreviewable,
}: FilePreviewProps) {
  const cat = getMimeCategory(mimeType)

  // Image : afficher directement si previewable, sinon cover floutée
  if (cat === 'image') {
    if (isPubliclyPreviewable) {
      return (
        <div className="rounded-xl overflow-hidden border border-border bg-surface-2 flex items-center justify-center min-h-48">
          <img
            src={`/api/files/${fileId}/preview`}
            alt={title}
            className="max-w-full max-h-[500px] object-contain"
          />
        </div>
      )
    }
    return coverImage
      ? <BlurredPreview src={coverImage} label="Achète pour voir l'image en pleine résolution" />
      : <EmojiPlaceholder emoji="🖼️" label="Image" />
  }

  // Audio
  if (cat === 'audio') {
    return (
      <div className="surface-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">🎵</span>
          <div>
            <p className="font-medium text-primary">{title}</p>
            <p className="text-sm text-muted">{mimeType}</p>
          </div>
        </div>
        {isPubliclyPreviewable ? (
          <audio controls className="w-full" src={`/api/files/${fileId}/preview`}>
            Ton navigateur ne supporte pas l'audio.
          </audio>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
            <span className="text-2xl">🔒</span>
            <span className="text-sm text-muted">Écoute disponible après achat</span>
          </div>
        )}
      </div>
    )
  }

  // Vidéo
  if (cat === 'video') {
    return (
      <div className="surface-card overflow-hidden rounded-xl">
        {isPubliclyPreviewable ? (
          <video
            controls
            className="w-full max-h-96"
            src={`/api/files/${fileId}/preview`}
            poster={coverImage ?? undefined}
          >
            Ton navigateur ne supporte pas la vidéo.
          </video>
        ) : coverImage ? (
          <BlurredPreview src={coverImage} label="Achète pour regarder la vidéo" />
        ) : (
          <EmojiPlaceholder emoji="🎬" label="Vidéo" />
        )}
      </div>
    )
  }

  // PDF
  if (mimeType === 'application/pdf' && isPubliclyPreviewable) {
    return (
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: '480px' }}>
        <iframe
          src={`/api/files/${fileId}/preview`}
          className="w-full h-full"
          title={title}
        />
      </div>
    )
  }

  // Default : couverture ou placeholder
  if (coverImage) {
    return (
      <div className="rounded-xl overflow-hidden border border-border">
        <img src={coverImage} alt={title} className="w-full max-h-64 object-cover" />
      </div>
    )
  }

  const EMOJIS: Record<string, string> = {
    document: '📄', code: '💻', archive: '📦', other: '📁',
  }
  return <EmojiPlaceholder emoji={EMOJIS[cat] ?? '📁'} label={cat} />
}

// ---- Helpers ----
function BlurredPreview({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden">
      <img src={src} alt="" className="w-full max-h-64 object-cover blur-md scale-105" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="text-center text-white">
          <span className="text-3xl block mb-2">🔒</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
      </div>
    </div>
  )
}

function EmojiPlaceholder({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 border border-border h-40 flex flex-col items-center justify-center gap-2">
      <span className="text-5xl">{emoji}</span>
      <span className="text-sm text-muted capitalize">{label}</span>
    </div>
  )
}
