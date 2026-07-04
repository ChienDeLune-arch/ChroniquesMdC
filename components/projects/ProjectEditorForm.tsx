'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Editor } from '@/components/editor/Editor'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import {
  Globe, Lock, Upload, X, Plus, Trash2,
  RefreshCw, Save, Send, Target, Euro,
} from 'lucide-react'

interface Tier {
  id?:          string
  title:        string
  description:  string
  amount:       number   // centimes
  max_backers:  number | ''
}

interface ProjectEditorFormProps {
  userId: string
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF']

export function ProjectEditorForm({ userId }: ProjectEditorFormProps) {
  const router   = useRouter()
  const supabase = createClient()

  const [title,       setTitle]       = useState('')
  const [shortDesc,   setShortDesc]   = useState('')
  const [content,     setContent]     = useState<Record<string, unknown>>({})
  const [coverImage,  setCoverImage]  = useState<string | null>(null)
  const [slug,        setSlug]        = useState('')
  const [goalAmount,  setGoalAmount]  = useState('')           // en euros, saisie utilisateur
  const [currency,    setCurrency]    = useState('EUR')
  const [endsAt,      setEndsAt]      = useState('')
  const [visibility,  setVisibility]  = useState('public')
  const [tiers,       setTiers]       = useState<Tier[]>([])
  const [saving,      setSaving]      = useState(false)
  const [publishing,  setPublishing]  = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const slugEdited = useRef(false)
  const projectId  = useRef<string | null>(null)

  // Auto-slug
  const handleTitle = (v: string) => {
    setTitle(v)
    if (!slugEdited.current) setSlug(slugify(v).slice(0, 80))
  }

  // Upload cover
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]; if (!file) return
    setUploadingCover(true)
    const path = `covers/${userId}/${Date.now()}.${file.name.split('.').pop()}`
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

  // Gestion des paliers
  function addTier() {
    setTiers(prev => [...prev, { title: '', description: '', amount: 1000, max_backers: '' }])
  }

  function updateTier(i: number, field: keyof Tier, value: string | number) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function removeTier(i: number) {
    setTiers(prev => prev.filter((_, idx) => idx !== i))
  }

  // Sauvegarde
  async function upsert(status: string) {
    if (!title.trim()) { toast.error('Ajoute un titre.'); return false }
    const goal = parseFloat(goalAmount)
    if (!goal || goal <= 0) { toast.error('Définis un objectif de financement.'); return false }

    const payload = {
      title:       title.trim(),
      slug:        slug || slugify(title).slice(0, 80),
      short_desc:  shortDesc.trim() || null,
      content,
      cover_image: coverImage,
      goal_amount: Math.round(goal * 100),
      currency,
      ends_at:     endsAt || null,
      visibility,
      status,
      creator_id:  userId,
    }

    let id = projectId.current
    if (id) {
      const { error } = await supabase.from('projects').update(payload).eq('id', id)
      if (error) { toast.error(error.message); return false }
    } else {
      const { data, error } = await supabase
        .from('projects').insert(payload).select('id').single()
      if (error || !data) { toast.error(error?.message ?? 'Erreur'); return false }
      id = data.id
      projectId.current = id
    }

    // Synchroniser les paliers
    if (id) {
      // Supprimer les anciens
      await supabase.from('project_tiers').delete().eq('project_id', id)
      // Recréer
      const validTiers = tiers.filter(t => t.title && t.amount > 0)
      if (validTiers.length) {
        await supabase.from('project_tiers').insert(
          validTiers.map(t => ({
            project_id:  id,
            title:       t.title,
            description: t.description || null,
            amount:      Number(t.amount),
            max_backers: t.max_backers === '' ? null : Number(t.max_backers),
          }))
        )
      }
    }
    return id
  }

  async function saveDraft() {
    if (saving) return
    setSaving(true)
    await upsert('draft')
    setSaving(false)
    toast.success('Brouillon sauvegardé')
  }

  async function publish() {
    if (publishing) return
    setPublishing(true)
    const id = await upsert('active')
    setPublishing(false)
    if (id) {
      toast.success('Projet lancé !')
      router.push(`/public/projects/${slug || slugify(title)}`)
    }
  }

  return (
    <div className="space-y-6">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-primary">Nouveau projet</h1>
        <div className="flex gap-2">
          <button onClick={saveDraft} disabled={saving} className="btn-secondary btn-sm">
            <Save size={14} />{saving ? 'Sauvegarde…' : 'Brouillon'}
          </button>
          <button onClick={publish} disabled={publishing} className="btn-primary btn-sm">
            <Target size={14} />{publishing ? 'Publication…' : 'Lancer le projet'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">

        {/* Zone principale */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Titre */}
          <input
            type="text"
            value={title}
            onChange={e => handleTitle(e.target.value)}
            placeholder="Titre du projet…"
            className="w-full text-3xl font-semibold text-primary bg-transparent border-none outline-none placeholder:text-muted"
          />

          {/* Résumé */}
          <textarea
            value={shortDesc}
            onChange={e => setShortDesc(e.target.value)}
            placeholder="En une phrase, de quoi s'agit-il ?"
            rows={2}
            maxLength={300}
            className="input resize-none text-base"
          />

          {/* Cover */}
          {coverImage ? (
            <div className="relative rounded-xl overflow-hidden group">
              <img src={coverImage} alt="" className="w-full max-h-60 object-cover" />
              <button
                onClick={() => setCoverImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              ><X size={14} /></button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-green-400 bg-green-50/20' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-muted">
                {uploadingCover
                  ? <><RefreshCw size={20} className="animate-spin" />Upload…</>
                  : <><Upload size={20} /><span className="text-sm">Image de couverture</span></>
                }
              </div>
            </div>
          )}

          {/* Description longue */}
          <div>
            <label className="label">Description du projet</label>
            <Editor
              content={content}
              onChange={setContent}
              placeholder="Décris ton projet en détail — pourquoi, comment, pour qui…"
            />
          </div>

          {/* ---- Paliers de récompense ---- */}
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-primary">Paliers de récompense</h2>
              <button onClick={addTier} className="btn-secondary btn-sm">
                <Plus size={14} />Ajouter un palier
              </button>
            </div>

            {tiers.length === 0 && (
              <p className="text-sm text-muted text-center py-4">
                Ajoute des paliers pour offrir des récompenses à tes soutiens.
              </p>
            )}

            <div className="space-y-4">
              {tiers.map((tier, i) => (
                <div key={i} className="surface-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Nom du palier</label>
                        <input
                          type="text"
                          value={tier.title}
                          onChange={e => updateTier(i, 'title', e.target.value)}
                          placeholder="ex: Soutien de base"
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Montant minimum ({currency})</label>
                        <div className="relative">
                          <Euro size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                          <input
                            type="number"
                            value={tier.amount / 100}
                            onChange={e => updateTier(i, 'amount', Math.round(parseFloat(e.target.value || '0') * 100))}
                            min="1"
                            step="1"
                            className="input text-sm pl-7"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTier(i)}
                      className="text-muted hover:text-danger transition-colors mt-6"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <label className="label text-xs">Description de la récompense</label>
                    <textarea
                      value={tier.description}
                      onChange={e => updateTier(i, 'description', e.target.value)}
                      placeholder="Qu'est-ce que ce palier apporte ?"
                      rows={2}
                      className="input resize-none text-sm"
                    />
                  </div>

                  <div className="w-48">
                    <label className="label text-xs">Nombre de places maximum</label>
                    <input
                      type="number"
                      value={tier.max_backers}
                      onChange={e => updateTier(i, 'max_backers', e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="Illimité"
                      min="1"
                      className="input text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 space-y-4">

          {/* Objectif */}
          <SideSection title="Objectif financier">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Euro size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="number"
                  value={goalAmount}
                  onChange={e => setGoalAmount(e.target.value)}
                  placeholder="1000"
                  min="1"
                  className="input text-sm pl-7"
                />
              </div>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="input text-sm w-20"
              >
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </SideSection>

          {/* Date de fin */}
          <SideSection title="Date limite">
            <input
              type="date"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="input text-sm"
            />
            <p className="text-xs text-muted mt-1">Laisser vide = sans limite</p>
          </SideSection>

          {/* Visibilité */}
          <SideSection title="Visibilité">
            <div className="space-y-1">
              {[
                { v: 'public', label: 'Public', icon: Globe, desc: 'Visible par tous' },
                { v: 'private', label: 'Privé', icon: Lock, desc: 'Lien seulement' },
              ].map(({ v, label, icon: Icon, desc }) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    visibility === v
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                      : 'text-secondary hover:bg-surface-1'
                  }`}
                >
                  <Icon size={14} />
                  <div>
                    <div>{label}</div>
                    <div className="text-xs text-muted">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </SideSection>

          {/* URL */}
          <SideSection title="URL">
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); slugEdited.current = true }}
              className="input text-xs font-mono"
            />
            <p className="text-xs text-muted mt-1 truncate">/public/projects/{slug}</p>
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
