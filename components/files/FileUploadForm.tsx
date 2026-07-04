'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, X, Globe, Lock, Users, Euro, RefreshCw, FileText } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'
import type { Tag } from '@/lib/types'

interface FileUploadFormProps {
  userId:        string
  availableTags: Tag[]
}

const MAX_FILE_SIZE = 100 * 1024 * 1024  // 100 Mo

export function FileUploadForm({ userId, availableTags }: FileUploadFormProps) {
  const router   = useRouter()
  const supabase = createClient()

  const [file,          setFile]          = useState<File | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [uploadPct,     setUploadPct]     = useState(0)
  const [title,         setTitle]         = useState('')
  const [description,   setDescription]   = useState('')
  const [visibility,    setVisibility]    = useState('public')
  const [pricingType,   setPricingType]   = useState('free')
  const [price,         setPrice]         = useState('')
  const [currency,      setCurrency]      = useState('EUR')
  const [selectedTags,  setSelectedTags]  = useState<Tag[]>([])
  const [tagSearch,     setTagSearch]     = useState('')
  const [tagOpen,       setTagOpen]       = useState(false)
  const [coverImage,    setCoverImage]    = useState<string | null>(null)
  const [saving,        setSaving]        = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    if (f.size > MAX_FILE_SIZE) { toast.error('Fichier trop volumineux (max 100 Mo)'); return }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
    // Auto-cover pour les images
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setCoverImage(url)
    }
  }, [title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, maxSize: MAX_FILE_SIZE,
  })

  async function handleSubmit() {
    if (!file)         { toast.error('Sélectionne un fichier'); return }
    if (!title.trim()) { toast.error('Ajoute un titre'); return }
    if (pricingType !== 'free' && !price) { toast.error('Indique un prix'); return }

    setSaving(true)
    setUploading(true)

    try {
      // 1. Upload vers Supabase Storage
      const ext      = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

      const { data: storageData, error: storageError } = await supabase.storage
        .from('files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) throw storageError
      setUploading(false)

      // 2. Upload cover séparée si image (publique)
      let coverUrl: string | null = null
      if (file.type.startsWith('image/')) {
        const coverPath = `covers/${userId}/${Date.now()}.${ext}`
        const { data: coverData } = await supabase.storage
          .from('covers')
          .upload(coverPath, file, { upsert: true })
        if (coverData) {
          const { data: urlData } = supabase.storage.from('covers').getPublicUrl(coverPath)
          coverUrl = urlData.publicUrl
        }
      }

      // 3. Enregistrer en base
      const priceInCents = pricingType === 'free' ? 0 : Math.round(parseFloat(price) * 100)

      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          uploader_id:  userId,
          title:        title.trim(),
          description:  description.trim() || null,
          file_path:    storageData.path,
          file_name:    file.name,
          file_size:    file.size,
          mime_type:    file.type,
          cover_image:  coverUrl,
          visibility,
          pricing_type: pricingType,
          price:        priceInCents,
          currency,
        })
        .select('id')
        .single()

      if (dbError) throw dbError

      // 4. Tags
      if (selectedTags.length && fileRecord) {
        await supabase.from('file_tags').insert(
          selectedTags.map(t => ({ file_id: fileRecord.id, tag_id: t.id }))
        )
      }

      toast.success('Fichier mis en ligne !')
      router.push(`/public/files/${fileRecord.id}`)

    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
      setUploading(false)
    } finally {
      setSaving(false)
    }
  }

  const filteredTags = availableTags.filter(
    t => t.name.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.some(s => s.id === t.id)
  )

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-primary">Mettre en ligne un fichier</h1>

      {/* Zone de drop */}
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-[rgb(var(--color-accent))] bg-accent-light'
              : 'border-border hover:border-[rgb(var(--color-border-strong))]'
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={36} className="mx-auto mb-4 text-muted" />
          <p className="text-primary font-medium mb-1">Glisse ton fichier ici</p>
          <p className="text-sm text-muted">ou clique pour parcourir</p>
          <p className="text-xs text-muted mt-2">Tout format · max 100 Mo</p>
        </div>
      ) : (
        <div className="surface-card p-4 flex items-center gap-4">
          <span className="text-3xl">
            {file.type.startsWith('image/') ? '🖼️'
              : file.type.startsWith('audio/') ? '🎵'
              : file.type.startsWith('video/') ? '🎬'
              : file.type === 'application/pdf' ? '📄'
              : '📁'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-primary truncate">{file.name}</p>
            <p className="text-sm text-muted">{formatFileSize(file.size)} · {file.type || 'fichier'}</p>
          </div>
          <button onClick={() => setFile(null)} className="text-muted hover:text-danger">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Barre d'upload */}
      {uploading && (
        <div className="surface-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw size={15} className="animate-spin text-[rgb(var(--color-accent))]" />
            <span className="text-sm text-primary">Upload en cours…</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill transition-all" style={{ width: '100%', animation: 'pulse 1.5s infinite' }} />
          </div>
        </div>
      )}

      {/* Métadonnées */}
      <div className="space-y-4">
        <div>
          <label className="label">Titre *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Nom de la ressource" />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input resize-none" placeholder="À quoi sert ce fichier ?" />
        </div>

        {/* Visibilité */}
        <div>
          <label className="label">Visibilité</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'public',  icon: Globe,  label: 'Public',  desc: 'Tout le monde' },
              { v: 'members', icon: Users,  label: 'Membres', desc: 'Connectés' },
              { v: 'private', icon: Lock,   label: 'Privé',   desc: 'Toi seul' },
            ].map(({ v, icon: Icon, label, desc }) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  visibility === v
                    ? 'border-[rgb(var(--color-accent))] bg-accent-light'
                    : 'border-border hover:border-[rgb(var(--color-border-strong))]'
                }`}
              >
                <Icon size={16} className={visibility === v ? 'text-[rgb(var(--color-accent))]' : 'text-muted'} />
                <p className="text-sm font-medium text-primary mt-1">{label}</p>
                <p className="text-xs text-muted">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tarification */}
        <div>
          <label className="label">Prix</label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { v: 'free', label: 'Gratuit',    color: 'text-green-600' },
              { v: 'paid', label: 'Payant',      color: 'text-[rgb(var(--color-accent))]' },
              { v: 'pwyw', label: 'Prix libre',  color: 'text-amber-600' },
            ].map(({ v, label, color }) => (
              <button
                key={v}
                onClick={() => setPricingType(v)}
                className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  pricingType === v
                    ? `border-transparent bg-surface-2 ${color}`
                    : 'border-border text-secondary hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {pricingType !== 'free' && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder={pricingType === 'pwyw' ? 'Montant suggéré (optionnel)' : 'Prix'}
                  min="0"
                  step="0.01"
                  className="input pl-8"
                />
              </div>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="input w-24">
                {['EUR','USD','GBP','CHF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags</label>
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTags(prev => prev.filter(s => s.id !== t.id))}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: t.color }}
                >
                  #{t.name} <X size={10} />
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <input
              type="text"
              value={tagSearch}
              onChange={e => { setTagSearch(e.target.value); setTagOpen(true) }}
              onFocus={() => setTagOpen(true)}
              placeholder="Ajouter des tags…"
              className="input"
            />
            {tagOpen && filteredTags.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-surface-1 border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {filteredTags.slice(0, 8).map(t => (
                  <li key={t.id}>
                    <button
                      onClick={() => { setSelectedTags(prev => [...prev, t]); setTagSearch(''); setTagOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-surface-2 text-left"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      #{t.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Soumettre */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={saving}
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={!file || saving}
          className="btn-primary flex-1 gap-2"
        >
          {saving ? <><RefreshCw size={15} className="animate-spin" />Mise en ligne…</> : <><Upload size={15} />Mettre en ligne</>}
        </button>
      </div>
    </div>
  )
}
