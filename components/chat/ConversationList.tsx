'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { getInitials, timeAgo, cn } from '@/lib/utils'
import { Users, Plus, MessageSquare } from 'lucide-react'

interface ConversationListProps {
  conversations: any[]
  groups:        any[]
  currentUserId: string
}

export function ConversationList({ conversations, groups, currentUserId }: ConversationListProps) {
  const pathname = usePathname()
  const [tab, setTab] = useState<'dm' | 'group'>('dm')

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-1 border border-border rounded-lg p-1">
        <button onClick={() => setTab('dm')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === 'dm' ? 'bg-surface-0 text-primary font-medium shadow-sm' : 'text-secondary'}`}>
          Messages
        </button>
        <button onClick={() => setTab('group')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === 'group' ? 'bg-surface-0 text-primary font-medium shadow-sm' : 'text-secondary'}`}>
          Groupes
        </button>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {tab === 'dm' && conversations.length === 0 && (
          <div className="text-center py-10 text-muted">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune conversation</p>
          </div>
        )}

        {tab === 'dm' && conversations.map((c, i) => {
          const href = `/private/chat/dm-${c.other.id}`
          const isActive = pathname === href
          const unread = !c.lastMessage.is_read && c.lastMessage.sender?.id !== currentUserId
          return (
            <Link key={i} href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors', isActive ? 'bg-accent-light' : 'hover:bg-surface-1')}>
              <div className="relative flex-shrink-0">
                {c.other.avatar_url
                  ? <img src={c.other.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  : <span className="avatar-md">{getInitials(c.other.display_name ?? c.other.username)}</span>
                }
                {unread && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[rgb(var(--color-accent))] rounded-full border-2 border-surface-0" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm truncate', unread ? 'font-semibold text-primary' : 'text-primary')}>
                  {c.other.display_name ?? c.other.username}
                </p>
                <p className="text-xs text-muted truncate">{c.lastMessage.content}</p>
              </div>
              <span className="text-xs text-muted flex-shrink-0">{timeAgo(c.lastMessage.created_at)}</span>
            </Link>
          )
        })}

        {tab === 'group' && (
          <>
            <Link href="/private/chat/new-group"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[rgb(var(--color-accent))] hover:bg-accent-light rounded-xl transition-colors">
              <Plus size={16} />Nouveau groupe
            </Link>
            {groups.map((g: any, i: number) => {
              const href = `/private/chat/group-${g.chat.id}`
              return (
                <Link key={i} href={href}
                  className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors', pathname === href ? 'bg-accent-light' : 'hover:bg-surface-1')}>
                  <span className="avatar-md flex-shrink-0">
                    {g.chat.avatar_url
                      ? <img src={g.chat.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      : <Users size={16} />
                    }
                  </span>
                  <p className="text-sm text-primary truncate">{g.chat.name}</p>
                </Link>
              )
            })}
            {groups.length === 0 && (
              <div className="text-center py-8 text-muted text-sm">Aucun groupe</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
