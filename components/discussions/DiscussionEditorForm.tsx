'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Editor } from '@/components/editor/Editor'
import { createClient } from '@/lib/supabase/client'
import { slugify, estimateReadingTime, getInitials, debounce } from '@/lib/utils'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import {
  Globe, Lock, Users, Save, Send, Upload, X,
  RefreshCw, UserPlus, Search, Loader2, Clock,
} from 'lucide-react'
import type { Tag } from '@/lib/types'

interface DiscussionEditorFormProps {
  availableTags: Tag[]
  userId:        string
}

const VISIBILITY_OPTIONS = [
  { value: 'public',  label: 'Publique',  icon: Globe,  desc: 'Visible par tous' },
  { value: 'members', label: 'Membres',   icon: Users,  desc: 'Connectés seulement' },
  { value: 'private', label: 'Privée',    icon: Lock,   desc: 'Toi seul' },
]

export function DiscussionEditorForm({ availableTags, userId }: DiscussionEditorFormProps) {
  const router   = useRouter()
  const supabase = createClient()

  const [title,       setTitle]      = useState('')
  const [content,     setContent]    = useState<Record<string, unknown>>({})
  const [excerpt,     setExcerpt]    = useState('')
  const [coverImage,  setCoverImage] = useState<string | null>(null)
  const [slug,        setSlug]       = useState('')
  const [visibility,  setVisibility] = useState('public')
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [tagSearch,   setTagSearch]  = useState('')
  const [tagOpen,     setTagOpen]    = useState(false)

  // Co-auteurs
  const [coAuthors,       setCoAuthors]       = useState<any[]>([])
  const [authorSearch,    setAuthorSearch]    = useState('')
  const [authorResults,   setAuthorResults]   = useState<any[]>([])
  const [searchingAuthors, setSearchingAuthors] = useState(false)

  const [saving,       setSaving]    = useState(false)
  const [publishing,   setPublishing] = useState(false)
  const [lastSaved,    setLastSaved]  = useState<Date | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [readingTime,  setReadingTime] = useState(0)

  const postId       = useRef<string | null>(null)
  const slugEdited   = useRef(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!slugEdited.current && title) setSlug(slugify(title).slice(0, 80))
  }, [title])

  useEffect(() => {
    if (!title) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft(), 4000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [title, content, excerpt, visibility, selectedTags])

  // Ctrl+S
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft() }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  })

  // Recherche de co-auteurs
  const searchAuthors = debounce(async (q: string) => {
    if (!q.trim()) { setAuthorResults([]); return }
    setSearchingAuthors(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', userId)
      .limit(6)
    setAuthorResults(
      (data ?? []).filter(p => !coAuthors.some((c: any) => c.id === p.id))
    )
    setSearchingAuthors(false)
  }, 300)

  useEffect(() => { searchAuthors(authorSearch) }, [authorSearch])

  // Upload cover
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]; if (!file) return
    setUploadingCover(true)
    const ext  = file.name.split('.').pop()
    const path = `covers/${userId}/${Date.now()}.${ext}`
    const { data } = await supabase.storage.from('covers').upload(path, file, { upsert: true })
    if (data) {
      const { data: url } = supabase.storage.from('covers').getPublicUrl(path)
      setCoverImage(url.publicUrl)
    }
    setUploadingCover(false)
  }, [userId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1, maxSize: 5 * 1024 * 1024,
  })

  async function upsert(status: string) {
    if (!title.trim()) { toast.error('Ajoute un titre.'); return false }

    const payload = {
      title:        title.trim(),
      slug:         slug || slugify(title).slice(0, 80),
      content,
      excerpt:      excerpt.trim() || null,
      cover_image:  coverImage,
      type:         'discussion',
      status,
      visibility,
      author_id:    userId,
      reading_time: readingTime || null,
      published_at: status === 'published' ? new Date().toISOString() : null,
    }

    let id = postId.current
    if (id) {
      const { error } = await supabase.from('posts').update(payload).eq('id', id)
      if (error) { toast.error(error.message); return false }
    } else {
      const { data, error } = await supabase
        .from('posts').insert(payload).select('id').single()
      if (error || !data) { toast.error(error?.message ?? 'Erreur'); return false }
      id = data.id
      postId.current = id

      // Ajouter les co-auteurs
      if (coAuthors.length && id) {
        await supabase.from('post_authors').insert(
          coAuthors.map(a => ({ post_id: id, profile_id: a.id, role: 'co-author' }))
        )
      }
    }

    // Tags
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
      toast.success('Discussion publiée !')
      router.push(`/public/discussions/${postId.current}`)
    }
  }

  const filteredTags = availableTags.filter(
    t => t.name.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.some(s => s.id === t.id)
  )

  return (
    <div className="flex flex-col gap-6">

      {/* Barre du haut */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          {saving
            ? <><RefreshCw size={13} className="animate-spin" />Sauvegarde…</>
            : lastSaved
            ? <><Save size={13} />Sauvegardé {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
            : <span>Nouvelle discussion</span>
          }
          {readingTime > 0 && (
            <span className="flex items-center gap-1 ml-3"><Clock size={13} />~{readingTime} min</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={saveDraft} disabled={saving || publishing} className="btn-secondary btn-sm">
            <Save size={14} />Brouillon
          </button>
          <button onClick={publish} disabled={saving || publishing} className="btn-primary btn-sm">
            <Send size={14} />{publishing ? 'Publication…' : 'Publier'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">

        {/* Zone principale */}
        <div className="flex-1 min-w-0 space-y-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Sujet de la discussion…"
            className="w-full text-3xl font-semibold text-primary bg-transparent border-none outline-none placeholder:text-muted"
          />

          {/* Cover */}
          {coverImage ? (
            <div className="relative rounded-xl overflow-hidden group">
              <img src={coverImage} alt="" className="w-full max-h-56 object-cover" />
              <button
                onClick={() => setCoverImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              ><X size={14} /></button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-violet-400 bg-violet-50/30' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-muted">
                {uploadingCover
                  ? <><Loader2 size={18} className="animate-spin" />Upload…</>
                  : <><Upload size={18} /><span className="text-sm">Image de couverture (optionnel)</span></>
                }
              </div>
            </div>
          )}

          {/* Éditeur */}
          <Editor
            content={content}
            onChange={c => { setContent(c); setReadingTime(estimateReadingTime(c)) }}
            placeholder="Développe le sujet de la discussion…"
            showWordCount
          />
        </div>

        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 space-y-4">

          {/* Visibilité */}
          <SideSection title="Visibilité">
            {VISIBILITY_OPTIONS.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    visibility === opt.value
                      ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium'
                      : 'text-secondary hover:bg-surface-1'
                  }`}
                >
                  <Icon size={15} />
                  <div>
                    <div>{opt.label}</div>
                    <div className="text-xs text-muted">{opt.desc}</div>
                  </div>
                </button>
              )
            })}
          </SideSection>

          {/* Co-auteurs */}
          <SideSection title="Co-auteurs">
            <p className="text-xs text-muted mb-3">
              Invitez des membres à contribuer à cette discussion.
            </p>

            {coAuthors.length > 0 && (
              <ul className="space-y-2 mb-3">
                {coAuthors.map(a => (
                  <li key={a.id} className="flex items-center gap-2">
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      : <span className="avatar-sm">{getInitials(a.display_name ?? a.username)}</span>
                    }
                    <span className="text-xs text-primary flex-1 truncate">{a.display_name ?? a.username}</span>
                    <button
                      onClick={() => setCoAuthors(prev => prev.filter(c => c.id !== a.id))}
                      className="text-muted hover:text-danger"
                    ><X size={12} /></button>
                  </li>
                ))}
              </ul>
            )}

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={authorSearch}
                onChange={e => setAuthorSearch(e.target.value)}
                placeholder="Rechercher…"
                className="input text-xs py-2 pl-7"
              />
              {searchingAuthors && (
                <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted animate-spin" />
              )}
            </div>

            {authorResults.length > 0 && (
              <ul className="mt-1 border border-border rounded-lg overflow-hidden">
                {authorResults.map(p => (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setCoAuthors(prev => [...prev, p])
                        setAuthorSearch('')
                        setAuthorResults([])
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-1 transition-colors text-left"
                    >
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        : <span className="avatar-sm !w-5 !h-5 text-[9px]">{getInitials(p.display_name ?? p.username)}</span>
                      }
                      <span className="text-primary truncate">{p.display_name ?? p.username}</span>
                      <span className="text-muted ml-auto">+</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SideSection>

          {/* Tags */}
          <SideSection title="Tags">
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTags(prev => prev.filter(s => s.id !== t.id))}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    #{t.name}<X size={10} />
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
                placeholder="Ajouter un tag…"
                className="input text-xs py-2"
              />
              {tagOpen && filteredTags.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-surface-1 border border-border rounded-lg shadow-lg z-10 max-h-36 overflow-y-auto">
                  {filteredTags.slice(0, 6).map(t => (
                    <li key={t.id}>
                      <button
                        onClick={() => { setSelectedTags(prev => [...prev, t]); setTagSearch(''); setTagOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-secondary hover:bg-surface-2 text-left"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                        #{t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SideSection>

          {/* Résumé */}
          <SideSection title="Introduction">
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="De quoi parle cette discussion ?"
              rows={3}
              maxLength={280}
              className="input resize-none text-sm"
            />
          </SideSection>
        </aside>
      </div>
    </div>
  )
}

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4">
      <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}
