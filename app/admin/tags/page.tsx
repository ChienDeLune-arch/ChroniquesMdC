'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { slugify, randomTagColor } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Trash2, Tag } from 'lucide-react'

interface Tag {
  id:    string
  name:  string
  slug:  string
  color: string
}

const PRESET_COLORS = [
  '#6B5FE4', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6',
  '#F97316', '#84CC16',
]

export const dynamic = 'force-dynamic'

export default function AdminTagsPage() {
  const supabase = createClient()
  const [tags,    setTags]    = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [name,    setName]    = useState('')
  const [color,   setColor]   = useState(PRESET_COLORS[0])
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('tags').select('id, name, slug, color').order('name')
    setTags(data ?? [])
    setLoading(false)
  }

  async function createTag() {
    if (!name.trim()) { toast.error('Nom requis'); return }
    setSaving(true)

    const slug = slugify(name.trim())

    // Vérifier si déjà existant
    const exists = tags.some(t => t.slug === slug)
    if (exists) { toast.error('Ce tag existe déjà'); setSaving(false); return }

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: name.trim(), slug, color })
      .select('id, name, slug, color')
      .single()

    setSaving(false)
    if (error) { toast.error(error.message); return }

    setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setName('')
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    toast.success(`Tag #${data.name} créé`)
  }

  async function deleteTag(id: string, name: string) {
    if (!confirm(`Supprimer le tag #${name} ? Il sera retiré de tous les posts.`)) return

    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) { toast.error(error.message); return }

    setTags(prev => prev.filter(t => t.id !== id))
    toast.success('Tag supprimé')
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[rgb(var(--color-primary))]"
          style={{ fontFamily: 'var(--font-space)' }}>
          Tags
        </h1>
        <p className="text-[rgb(var(--color-secondary))] mt-1">
          {tags.length} tag{tags.length > 1 ? 's' : ''} au total
        </p>
      </div>

      {/* Formulaire de création */}
      <div className="surface-card p-5 space-y-4">
        <h2 className="font-medium text-[rgb(var(--color-primary))] flex items-center gap-2">
          <Plus size={16} />Nouveau tag
        </h2>

        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTag()}
            placeholder="Nom du tag…"
            className="input flex-1"
            maxLength={50}
          />
          <button
            onClick={createTag}
            disabled={saving || !name.trim()}
            className="btn-primary gap-2"
          >
            <Plus size={15} />
            {saving ? 'Création…' : 'Créer'}
          </button>
        </div>

        {/* Sélecteur de couleur */}
        <div>
          <label className="label">Couleur</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-[rgb(var(--color-border-strong))]' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            {/* Couleur personnalisée */}
            <div className="relative">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-none p-0 opacity-0 absolute inset-0"
              />
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-[rgb(var(--color-border-strong))] flex items-center justify-center text-[rgb(var(--color-muted))] text-xs pointer-events-none">
                +
              </div>
            </div>
          </div>

          {/* Aperçu */}
          {name && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-[rgb(var(--color-muted))]">Aperçu :</span>
              <span
                className="badge font-medium"
                style={{ backgroundColor: `${color}22`, color }}
              >
                #{name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Liste des tags */}
      <div>
        <h2 className="text-sm font-medium text-[rgb(var(--color-muted))] uppercase tracking-wider mb-3">
          Tags existants
        </h2>

        {loading ? (
          <div className="surface-card p-8 text-center text-[rgb(var(--color-muted))]">
            Chargement…
          </div>
        ) : tags.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <Tag size={28} className="mx-auto mb-2 opacity-20" />
            <p className="text-[rgb(var(--color-muted))]">Aucun tag pour le moment.</p>
          </div>
        ) : (
          <div className="surface-card divide-y divide-[rgb(var(--color-border))] overflow-hidden">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="font-medium text-[rgb(var(--color-primary))]">#{tag.name}</span>
                  <span className="text-xs text-[rgb(var(--color-muted))] font-mono">{tag.slug}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="badge text-xs"
                    style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                  >
                    #{tag.name}
                  </span>
                  <button
                    onClick={() => deleteTag(tag.id, tag.name)}
                    className="text-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-danger))] transition-colors p-1"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
