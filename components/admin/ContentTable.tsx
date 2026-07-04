'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate, formatPrice, formatFileSize } from '@/lib/utils'
import { Trash2, ExternalLink, Eye } from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  draft:     'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  archived:  'badge-neutral',
  active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  funded:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  closed:    'badge-neutral',
}

export function ContentTable({ type, items }: { type: string; items: any[] }) {
  const supabase = createClient()
  const [rows, setRows] = useState(items)

  async function deleteItem(id: string, table: string) {
    if (!confirm('Supprimer définitivement ?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setRows(prev => prev.filter(r => r.id !== id))
    toast.success('Supprimé')
  }

  async function changeStatus(id: string, table: string, status: string) {
    const { error } = await supabase.from(table).update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    toast.success('Statut mis à jour')
  }

  if (!rows.length) return <p className="text-muted text-sm">Aucun contenu.</p>

  if (type === 'posts') return (
    <div className="surface-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>{['Titre','Type','Statut','Vues','Date','Actions'].map(h => (
            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(p => (
            <tr key={p.id} className="hover:bg-surface-1 transition-colors">
              <td className="px-4 py-3 max-w-xs">
                <p className="font-medium text-primary truncate">{p.title}</p>
                <p className="text-xs text-muted">par {p.author?.display_name ?? p.author?.username}</p>
              </td>
              <td className="px-4 py-3"><span className="badge-neutral">{p.type}</span></td>
              <td className="px-4 py-3">
                <select value={p.status} onChange={e => changeStatus(p.id, 'posts', e.target.value)}
                  className={`badge cursor-pointer border-none outline-none ${STATUS_BADGE[p.status] ?? 'badge-neutral'}`}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </td>
              <td className="px-4 py-3 text-muted">{p.views}</td>
              <td className="px-4 py-3 text-xs text-muted">{p.published_at ? formatDate(p.published_at) : '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <a href={`/public/blog/${p.slug}`} target="_blank" className="text-muted hover:text-primary"><ExternalLink size={14} /></a>
                  <button onClick={() => deleteItem(p.id, 'posts')} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (type === 'files') return (
    <div className="surface-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>{['Fichier','Type','Prix','Téléch.','Auteur','Actions'].map(h => (
            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(f => (
            <tr key={f.id} className="hover:bg-surface-1 transition-colors">
              <td className="px-4 py-3 max-w-xs"><p className="font-medium text-primary truncate">{f.title}</p></td>
              <td className="px-4 py-3 text-xs text-muted font-mono">{f.mime_type?.split('/')[1] ?? '—'}</td>
              <td className="px-4 py-3">
                {f.pricing_type === 'free'
                  ? <span className="badge bg-green-100 text-green-800">Gratuit</span>
                  : <span className="badge-accent">{formatPrice(f.price, 'EUR')}</span>}
              </td>
              <td className="px-4 py-3 text-muted">{f.download_count}</td>
              <td className="px-4 py-3 text-xs text-muted">{f.uploader?.username}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <a href={`/public/files/${f.id}`} target="_blank" className="text-muted hover:text-primary"><ExternalLink size={14} /></a>
                  <button onClick={() => deleteItem(f.id, 'files')} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (type === 'projects') return (
    <div className="surface-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>{['Projet','Statut','Levé','Objectif','Créateur','Actions'].map(h => (
            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(p => (
            <tr key={p.id} className="hover:bg-surface-1 transition-colors">
              <td className="px-4 py-3 max-w-xs"><p className="font-medium text-primary truncate">{p.title}</p></td>
              <td className="px-4 py-3">
                <select value={p.status} onChange={e => changeStatus(p.id, 'projects', e.target.value)}
                  className={`badge cursor-pointer border-none outline-none ${STATUS_BADGE[p.status] ?? 'badge-neutral'}`}>
                  {['draft','active','funded','closed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 font-medium text-[rgb(var(--color-accent))]">{formatPrice(p.current_amount, p.currency)}</td>
              <td className="px-4 py-3 text-muted">{formatPrice(p.goal_amount, p.currency)}</td>
              <td className="px-4 py-3 text-xs text-muted">{p.creator?.username}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <a href={`/public/projects/${p.slug}`} target="_blank" className="text-muted hover:text-primary"><ExternalLink size={14} /></a>
                  <button onClick={() => deleteItem(p.id, 'projects')} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return null
}
