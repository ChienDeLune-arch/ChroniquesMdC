'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Send, Euro, ChevronDown, ChevronUp } from 'lucide-react'

const TYPES = [
  { value: 'general',       label: 'Général',       desc: 'Question ou demande diverse' },
  { value: 'collaboration', label: 'Collaboration',  desc: 'Travailler ensemble sur un projet' },
  { value: 'content',       label: 'Contenu',        desc: 'Demande de création de contenu' },
  { value: 'technical',     label: 'Technique',      desc: 'Aide ou conseil technique' },
  { value: 'commercial',    label: 'Commercial',     desc: 'Proposition commerciale' },
]

export function RequestForm({ userId }: { userId: string }) {
  const supabase = createClient()
  const [open,       setOpen]       = useState(false)
  const [title,      setTitle]      = useState('')
  const [description, setDescription] = useState('')
  const [type,       setType]       = useState('general')
  const [isPublic,   setIsPublic]   = useState(false)
  const [budgetMin,  setBudgetMin]  = useState('')
  const [budgetMax,  setBudgetMax]  = useState('')
  const [saving,     setSaving]     = useState(false)

  async function submit() {
    if (!title.trim())       { toast.error('Titre requis'); return }
    if (!description.trim()) { toast.error('Description requise'); return }

    setSaving(true)
    const { error } = await supabase.from('requests').insert({
      requester_id: userId,
      title:        title.trim(),
      description:  description.trim(),
      type,
      is_public:    isPublic,
      budget_min:   budgetMin ? Math.round(parseFloat(budgetMin) * 100) : null,
      budget_max:   budgetMax ? Math.round(parseFloat(budgetMax) * 100) : null,
      status:       'pending',
    })
    setSaving(false)

    if (error) { toast.error(error.message); return }

    toast.success('Requête envoyée !')
    setTitle('')
    setDescription('')
    setType('general')
    setBudgetMin('')
    setBudgetMax('')
    setIsPublic(false)
    setOpen(false)
  }

  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-2 transition-colors"
      >
        <div>
          <p className="font-medium text-primary">Envoyer une requête</p>
          <p className="text-sm text-muted mt-0.5">Collaboration, question, demande sur mesure…</p>
        </div>
        {open ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border space-y-4 pt-5">

          {/* Type */}
          <div>
            <label className="label">Type de requête</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={`px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                    type === t.value
                      ? 'border-[rgb(var(--color-accent))] bg-accent-light'
                      : 'border-border hover:border-[rgb(var(--color-border-strong))]'
                  }`}>
                  <p className={`font-medium ${type === t.value ? 'text-[rgb(var(--color-accent))]' : 'text-primary'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-muted">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="label">Titre *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="En une phrase, de quoi s'agit-il ?" className="input" maxLength={200} />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Détaille ta demande, le contexte, tes attentes…"
              rows={4} className="input resize-none" maxLength={2000} />
            <p className="text-xs text-muted text-right mt-1">{description.length}/2000</p>
          </div>

          {/* Budget */}
          <div>
            <label className="label">Budget estimé (optionnel)</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Euro size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)}
                  placeholder="Min" min="0" step="10" className="input pl-8 text-sm" />
              </div>
              <span className="text-muted">–</span>
              <div className="relative flex-1">
                <Euro size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
                  placeholder="Max" min="0" step="10" className="input pl-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Visibilité */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded accent-[rgb(var(--color-accent))]" />
            <span className="text-sm text-secondary">
              Rendre cette requête publique (visible sur le site)
            </span>
          </label>

          {/* Boutons */}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1 gap-2">
              <Send size={15} />
              {saving ? 'Envoi…' : 'Envoyer la requête'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
