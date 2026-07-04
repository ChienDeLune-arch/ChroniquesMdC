'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Editor } from '@/components/editor/Editor'
import { createClient } from '@/lib/supabase/client'
import { slugify, estimateReadingTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import {
  Globe, Lock, Users, Eye, Save, Send,
  Upload, X, Tag, ChevronDown, Clock, FileText, RefreshCw,
} from 'lucide-react'
import type { Tag as TagType } from '@/lib/types'

interface InitialPost {
  id:             string
  title:          string
  slug:           string
  content:        Record<string, unknown> | null
  excerpt:        string | null
  cover_image:    string | null
  type:           string
  status:         string
  visibility:     string
  allow_comments: boolean
  post_tags:      { tag: TagType }[]
}

interface PostEditorFormProps {
  initialPost:   InitialPost | null
  availableTags: TagType[]
  userId:        string
}

const VISIBILITY_OPTIONS = [
  { value: 'public',  label: 'Public',  icon: Globe,  desc: 'Visible par tous' },
  { value: 'members', label: 'Membres', icon: Users,  desc: 'Membres connectés' },
  { value: 'private', label: 'Privé',   icon: Lock,   desc: 'Toi seul' },
]

const TYPE_OPTIONS = [
  { value: 'blog',       label: 'Article' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'note',       label: 'Note' },
]

export function PostEditorForm({ initialPost, availableTags, userId }: PostEditorFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // ---- État ----
  const [title,       setTitle]       = useState(initialPost?.title ?? '')
  const [content,     setContent]     = useState<Record<string, unknown>>(initialPost?.content ?? {})
  const [excerpt,     setExcerpt]     = useState(initialPost?.excerpt ?? '')
  const [coverImage,  setCoverImage]  = useState<string | null>(initialPost?.cover_image ?? null)
  const [slug,        setSlug]        = useState(initialPost?.slug ?? '')
  const [type,        setType]        = useState(initialPost?.type ?? 'blog')
  const [visibility,  setVisibility]  = useState(initialPost?.visibility ?? 'public')
  const [allowComments, setAllowComments] = useState(initialPost?.allow_comments ?? true)
  const [selectedTags, setSelectedTags]  = useState<TagType[]>(
    initialPost?.post_tags?.map(pt => pt.tag).filter(Boolean) ?? []
  )
  const [tagSearch,   setTagSearch]   = useState('')
  const [tagOpen,     setTagOpen]     = useState(false)

  const [saving,       setSaving]     = useState(false)
  const [publishing,   setPublishing] = useState(false)
  const [lastSaved,    setLastSaved]  = useState<Date | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [readingTime,  setReadingTime] = useState(initialPost?.content
    ? estimateReadingTime(initialPost.content) : 0)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const postId = useRef<string | null>(initialPost?.id ?? null)
  const slugEdited = useRef(!!initialPost?.slug)

  // Auto-slug depuis le titre
  useEffect(() => {
    if (!slugEdited.current && title) {
      setSlug(slugify(title).slice(0, 80))
    }
  }, [title])

  // Auto-save après 3s d'inactivité
  useEffect(() => {
    if (!title && !Object.keys(content).length) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft(), 3000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [title, content, excerpt, visibility, type, selectedTags, allowComments])

  // Ctrl+S
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveDraft()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [title, content, slug, excerpt, visibility, type, selectedTags, allowComments, coverImage])

  // Mise à jour reading time
  function handleContentChange(c: Record<string, unknown>) {
    setContent(c)
    setReadingTime(estimateReadingTime(c))
  }

  // ---- Upload couverture ----
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploadingCover(true)
    const ext  = file.name.split('.').pop()
    const path = `covers/${userId}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: true })
    if (error) { toast.error('Erreur upload'); setUploadingCover(false); return }
    const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
    setCoverImage(urlData.publicUrl)
    setUploadingCover(false)
  }, [userId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  })

  // ---- Sauvegarde ----
  async function upsert(status: string) {
    if (!title.trim()) { toast.error('Ajoute un titre.'); return false }

    const payload = {
      title:          title.trim(),
      slug:           slug || slugify(title).slice(0, 80),
      content,
      excerpt:        excerpt.trim() || null,
      cover_image:    coverImage,
      type,
      status,
      visibility,
      allow_comments: allowComments,
      author_id:      userId,
      reading_time:   readingTime || null,
      published_at:   status === 'published' ? new Date().toISOString() : null,
    }

    let id = postId.current

    if (id) {
      const { error } = await supabase.from('posts').update(payload).eq('id', id)
      if (error) { toast.error(error.message); return false }
    } else {
      const { data, error } = await supabase
        .from('posts')
        .insert(payload)
        .select('id')
        .single()
      if (error || !data) { toast.error(error?.message ?? 'Erreur'); return false }
      id = data.id
      postId.current = id
    }

    // Sync des tags
    if (id) {
      await supabase.from('post_tags').delete().eq('post_id', id)
      if (selectedTags.length) {
        await supabase.from('post_tags').insert(
          selectedTags.map(t => ({ post_id: id!, tag_id: t.id }))
        )
      }
    }

    return true
  }

  async function saveDraft() {
    if (saving || publishing) return
    setSaving(true)
    const ok = await upsert('draft')
    setSaving(false)
    if (ok) setLastSaved(new Date())
  }

  async function publish() {
    if (saving || publishing) return
    setPublishing(true)
    const ok = await upsert('published')
    setPublishing(false)
    if (ok) {
      toast.success('Article publié !')
      router.push(`/public/blog/${slug || slugify(title)}`)
    }
  }

  const filteredTags = availableTags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
    !selectedTags.some(s => s.id === t.id)
  )

  return (
    <div className="flex flex-col gap-6">

      {/* Barre du haut */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          {saving ? (
            <><RefreshCw size={13} className="animate-spin" />Sauvegarde…</>
          ) : lastSaved ? (
            <><Save size={13} />Sauvegardé {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
          ) : (
            <span>Brouillon</span>
          )}
          {readingTime > 0 && (
            <span className="flex items-center gap-1 ml-3">
              <Clock size={13} />~{readingTime} min
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveDraft} disabled={saving || publishing} className="btn-secondary btn-sm">
            <Save size={14} />Brouillon
          </button>
          <button onClick={publish} disabled={saving || publishing} className="btn-primary btn-sm">
            <Send size={14} />
            {publishing ? 'Publication…' : 'Publier'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">

        {/* ---- Zone principale ---- */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Titre */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titre de l'article…"
            className="w-full text-3xl font-semibold text-primary bg-transparent border-none outline-none placeholder:text-muted resize-none leading-tight"
          />

          {/* Image de couverture */}
          {coverImage ? (
            <div className="relative rounded-xl overflow-hidden group">
              <img src={coverImage} alt="Couverture" className="w-full max-h-64 object-cover" />
              <button
                onClick={() => setCoverImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer transition-colors',
                isDragActive && 'border-[rgb(var(--color-accent))] bg-accent-light'
              )}
            >
              <input {...getInputProps()} />
              {uploadingCover ? (
                <div className="flex items-center justify-center gap-2 text-muted">
                  <RefreshCw size={16} className="animate-spin" />
                  Upload…
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted">
                  <Upload size={20} />
                  <span className="text-sm">Glisse une image ou clique pour upload</span>
                  <span className="text-xs">JPG, PNG, WebP · max 5 Mo</span>
                </div>
              )}
            </div>
          )}

          {/* Éditeur TipTap */}
          <Editor
            content={content}
            onChange={handleContentChange}
            placeholder="Commence à écrire…"
            showWordCount
          />
        </div>

        {/* ---- Sidebar métadonnées ---- */}
        <aside className="w-64 flex-shrink-0 space-y-4">

          {/* Visibilité */}
          <SidebarSection title="Visibilité">
            <div className="space-y-1">
              {VISIBILITY_OPTIONS.map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    onClick={() => setVisibility(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                      visibility === opt.value
                        ? 'bg-accent-light text-[rgb(var(--color-accent))] font-medium'
                        : 'text-secondary hover:bg-surface-1'
                    )}
                  >
                    <Icon size={15} />
                    <div>
                      <div>{opt.label}</div>
                      <div className="text-xs text-muted">{opt.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </SidebarSection>

          {/* Type */}
          <SidebarSection title="Type">
            <div className="flex gap-1">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded-md transition-colors',
                    type === opt.value
                      ? 'bg-[rgb(var(--color-accent))] text-white font-medium'
                      : 'bg-surface-1 text-secondary hover:bg-surface-2'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SidebarSection>

          {/* Tags */}
          <SidebarSection title="Tags">
            {/* Sélectionnés */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTags(prev => prev.filter(t => t.id !== tag.id))}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    #{tag.name}
                    <X size={10} />
                  </button>
                ))}
              </div>
            )}
            {/* Recherche */}
            <div className="relative">
              <input
                type="text"
                value={tagSearch}
                onChange={e => { setTagSearch(e.target.value); setTagOpen(true) }}
                onFocus={() => setTagOpen(true)}
                placeholder="Rechercher un tag…"
                className="input text-xs py-2"
              />
              {tagOpen && filteredTags.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-1 border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {filteredTags.slice(0, 8).map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTags(prev => [...prev, tag])
                        setTagSearch('')
                        setTagOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-secondary hover:bg-surface-2 transition-colors text-left"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      #{tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SidebarSection>

          {/* Excerpt */}
          <SidebarSection title="Résumé">
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Courte description pour les aperçus…"
              rows={3}
              maxLength={280}
              className="input resize-none text-sm"
            />
            <p className="text-xs text-muted text-right mt-1">{excerpt.length}/280</p>
          </SidebarSection>

          {/* Slug */}
          <SidebarSection title="URL">
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); slugEdited.current = true }}
              placeholder="mon-article"
              className="input text-xs font-mono"
            />
            <p className="text-xs text-muted mt-1 truncate">/public/blog/{slug}</p>
          </SidebarSection>

          {/* Options */}
          <SidebarSection title="Options">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={e => setAllowComments(e.target.checked)}
                className="w-4 h-4 rounded accent-[rgb(var(--color-accent))]"
              />
              <span className="text-sm text-secondary">Commentaires activés</span>
            </label>
          </SidebarSection>
        </aside>
      </div>
    </div>
  )
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4">
      <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}
