'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react'

interface Notification {
  id:         string
  type:       string
  title:      string
  body:       string | null
  link:       string | null
  is_read:    boolean
  created_at: string
}

export const dynamic = 'force-dynamic'

export default function NotificationsPage() {
  const supabase = createClient()
  const [notifs,   setNotifs]   = useState<Notification[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifs(data ?? [])
    setLoading(false)

    // Marquer toutes comme lues
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  const TYPE_ICONS: Record<string, string> = {
    comment:         '💬',
    mention:         '@',
    purchase:        '💳',
    purchase_success:'✅',
    contribution:    '🎯',
    co_author_invite:'✍️',
    group_invite:    '👥',
    payment_failed:  '⚠️',
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[rgb(var(--color-primary))] flex items-center gap-2"
            style={{ fontFamily: 'var(--font-space)' }}>
            <Bell size={22} />Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[rgb(var(--color-muted))] mt-0.5">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary btn-sm gap-1.5">
            <CheckCheck size={14} />Tout marquer lu
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[rgb(var(--color-muted))]" />
        </div>
      )}

      {!loading && notifs.length === 0 && (
        <div className="text-center py-20 surface-card">
          <Bell size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-[rgb(var(--color-muted))]">Aucune notification pour le moment.</p>
        </div>
      )}

      {!loading && notifs.length > 0 && (
        <div className="surface-card divide-y divide-[rgb(var(--color-border))] overflow-hidden">
          {notifs.map(notif => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                !notif.is_read
                  ? 'bg-[rgb(var(--color-accent)/0.05)]'
                  : 'hover:bg-[rgb(var(--color-surface-2))]'
              }`}
            >
              {/* Icône type */}
              <span className="text-lg flex-shrink-0 mt-0.5 w-7 text-center">
                {TYPE_ICONS[notif.type] ?? '🔔'}
              </span>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                {notif.link ? (
                  <Link href={notif.link}
                    onClick={() => markRead(notif.id)}
                    className="font-medium text-sm text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-accent))] transition-colors">
                    {notif.title}
                  </Link>
                ) : (
                  <p className="font-medium text-sm text-[rgb(var(--color-primary))]">{notif.title}</p>
                )}
                {notif.body && (
                  <p className="text-xs text-[rgb(var(--color-muted))] mt-0.5 truncate">{notif.body}</p>
                )}
                <p className="text-xs text-[rgb(var(--color-muted))] mt-1">{timeAgo(notif.created_at)}</p>
              </div>

              {/* Indicateur non lu */}
              <div className="flex-shrink-0 mt-1.5">
                {!notif.is_read ? (
                  <button
                    onClick={() => markRead(notif.id)}
                    className="w-2 h-2 rounded-full bg-[rgb(var(--color-accent))] hover:scale-125 transition-transform"
                    title="Marquer comme lu"
                  />
                ) : (
                  <Check size={14} className="text-[rgb(var(--color-muted))] opacity-40" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
