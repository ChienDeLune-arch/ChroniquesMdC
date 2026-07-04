'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, X, GripVertical, Globe, Users, Lock, Send } from 'lucide-react'

interface PollEditorFormProps { userId: string }

export function PollEditorForm({ userId }: PollEditorFormProps) {
  const router   = useRouter()
  const supabase = createClient()
  const [title,        setTitle]       = useState('')
  const [description,  setDescription] = useState('')
  const [options,      setOptions]     = useState(['', ''])
  const [visibility,   setVisibility]  = useState('public')
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [isAnonymous,  setIsAnonymous] = useState(false)
  const [showResults,  setShowResults] = useState('after_vote')
  const [endsAt,       setEndsAt]      = useState('')
  const [saving,       setSaving]      = useState(false)

  function addOption()    { setOptions(p => [...p, '']) }
  function removeOption(i: number) { if (options.length > 2) setOptions(p => p.filter((_, j) => j !== i)) }
  function updateOption(i: number, v: string) { setOptions(p => p.map((o, j) => j === i ? v : o)) }

  async function submit() {
    if (!title.trim())          { toast.error('Titre requis'); return }
    const valid = options.filter(o => o.trim())
    if (valid.length < 2)       { toast.error('Au moins 2 options'); return }
    setSaving(true)
    try {
      const { data: poll, error: pe } = await supabase.from('polls').insert({
        creator_id: userId, title: title.trim(),
        description: description.trim() || null,
        visibility, allow_multiple: allowMultiple,
        is_anonymous: isAnonymous, show_results: showResults,
        ends_at: endsAt || null, status: 'active',
      }).select('id').single()
      if (pe) throw pe

      const { error: oe } = await supabase.from('poll_options').insert(
        valid.map((text, i) => ({ poll_id: poll.id, text: text.trim(), position: i }))
      )
      if (oe) throw oe

      toast.success('Sondage créé !')
      router.push('/public/polls')
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const VISIBILITY = [
    { v: 'public',  icon: Globe,  l: 'Public',  d: 'Visible par tous' },
    { v: 'members', icon: Users,  l: 'Membres', d: 'Connectés seulement' },
    { v: 'private', icon: Lock,   l: 'Privé',   d: 'Toi seul' },
  ]

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-primary">Créer un sondage</h1>

      {/* Titre */}
      <div>
        <label className="label">Question *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Quelle est ta question ?" className="input text-base" />
      </div>

      {/* Description */}
      <div>
        <label className="label">Description (optionnel)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={2} className="input resize-none" placeholder="Contexte ou précisions…" />
      </div>

      {/* Options */}
      <div>
        <label className="label">Options *</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical size={16} className="text-muted flex-shrink-0" />
              <input type="text" value={opt} onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`} className="input flex-1" />
              <button onClick={() => removeOption(i)} disabled={options.length <= 2}
                className="text-muted hover:text-danger transition-colors disabled:opacity-30">
                <X size={16} />
              </button>
            </div>
          ))}
          <button onClick={addOption} className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-accent))] hover:underline mt-1">
            <Plus size={14} />Ajouter une option
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Visibilité */}
        <div>
          <label className="label">Visibilité</label>
          <div className="space-y-1.5">
            {VISIBILITY.map(({ v, icon: Icon, l, d }) => (
              <button key={v} onClick={() => setVisibility(v)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  visibility === v ? 'border-[rgb(var(--color-accent))] bg-accent-light' : 'border-border hover:border-[rgb(var(--color-border-strong))]'
                }`}>
                <Icon size={15} className={visibility === v ? 'text-[rgb(var(--color-accent))]' : 'text-muted'} />
                <div>
                  <p className="text-sm font-medium text-primary">{l}</p>
                  <p className="text-xs text-muted">{d}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Options avancées */}
        <div className="space-y-4">
          <div>
            <label className="label">Afficher les résultats</label>
            <select value={showResults} onChange={e => setShowResults(e.target.value)} className="input">
              <option value="after_vote">Après avoir voté</option>
              <option value="always">Toujours</option>
              <option value="after_close">Après la fermeture</option>
              <option value="never">Jamais</option>
            </select>
          </div>

          <div>
            <label className="label">Date de fermeture</label>
            <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]} className="input" />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)}
                className="w-4 h-4 rounded accent-[rgb(var(--color-accent))]" />
              <span className="text-sm text-secondary">Choix multiples autorisés</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded accent-[rgb(var(--color-accent))]" />
              <span className="text-sm text-secondary">Votes anonymes</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => router.back()} className="btn-secondary" disabled={saving}>Annuler</button>
        <button onClick={submit} disabled={saving} className="btn-primary flex-1 gap-2">
          <Send size={15} />{saving ? 'Création…' : 'Créer le sondage'}
        </button>
      </div>
    </div>
  )
}
