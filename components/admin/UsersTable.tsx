'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { getInitials, formatDate } from '@/lib/utils'
import { Shield, CheckCircle, XCircle } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  moderator: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  member:    'badge-neutral',
}

export function UsersTable({ users }: { users: any[] }) {
  const supabase = createClient()
  const [rows, setRows] = useState(users)

  async function setRole(userId: string, role: string) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) { toast.error(error.message); return }
    setRows(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    toast.success(`Rôle mis à jour : ${role}`)
  }

  async function toggleVerified(userId: string, current: boolean) {
    const { error } = await supabase.from('profiles').update({ is_verified: !current }).eq('id', userId)
    if (error) { toast.error(error.message); return }
    setRows(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !current } : u))
    toast.success(current ? 'Vérifié retiré' : 'Compte vérifié')
  }

  if (!rows.length) return <p className="text-muted text-sm">Aucun utilisateur trouvé.</p>

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Membre', 'Rôle', 'Accès privé', 'Vérifié', 'Inscrit', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(user => (
              <tr key={user.id} className="hover:bg-surface-1 transition-colors">
                {/* Membre */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      : <span className="avatar-sm flex-shrink-0">{getInitials(user.display_name ?? user.username)}</span>
                    }
                    <div>
                      <p className="font-medium text-primary">{user.display_name ?? user.username}</p>
                      <p className="text-xs text-muted">@{user.username}</p>
                    </div>
                  </div>
                </td>

                {/* Rôle */}
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={e => setRole(user.id, e.target.value)}
                    className={`badge cursor-pointer border-none outline-none ${ROLE_COLORS[user.role] ?? 'badge-neutral'}`}
                  >
                    <option value="member">member</option>
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </select>
                </td>

                {/* Accès privé */}
                <td className="px-4 py-3">
                  <button
                    onClick={async () => {
                      const val = !user.private_access
                      const { error } = await supabase.from('profiles').update({ private_access: val }).eq('id', user.id)
                      if (!error) {
                        setRows(prev => prev.map(u => u.id === user.id ? { ...u, private_access: val } : u))
                        toast.success(val ? 'Accès privé accordé' : 'Accès privé retiré')
                      }
                    }}
                    className={`flex items-center gap-1 text-xs transition-colors ${user.private_access ? 'text-[rgb(var(--color-accent))]' : 'text-muted'}`}
                  >
                    {user.private_access ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {user.private_access ? 'Oui' : 'Non'}
                  </button>
                </td>

                {/* Vérifié */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleVerified(user.id, user.is_verified)}
                    className={`flex items-center gap-1 text-xs transition-colors ${user.is_verified ? 'text-green-600' : 'text-muted hover:text-green-600'}`}
                    title={user.is_verified ? 'Retirer la vérification' : 'Vérifier ce compte'}
                  >
                    {user.is_verified ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {user.is_verified ? 'Oui' : 'Non'}
                  </button>
                </td>

                {/* Date */}
                <td className="px-4 py-3 text-xs text-muted">
                  {formatDate(user.created_at)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <a href={`/profile/${user.username}`} target="_blank"
                    className="text-xs text-[rgb(var(--color-accent))] hover:underline">
                    Voir →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
