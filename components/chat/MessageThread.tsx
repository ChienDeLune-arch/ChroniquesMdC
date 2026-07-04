'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials, cn, timeAgo, formatDateTime } from '@/lib/utils'
import { Send, Users } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Message {
  id: string; content: string; created_at: string
  sender: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null
}

interface Props {
  conversationId:     string
  initialMessages:    Message[]
  currentUserId:      string
  currentUserProfile: Profile | null
  otherProfile:       any
  groupChat:          any
}

export function MessageThread({
  conversationId, initialMessages, currentUserId, currentUserProfile, otherProfile, groupChat,
}: Props) {
  const supabase    = createClient()
  const [messages,  setMessages]  = useState<Message[]>(initialMessages)
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  const isDM    = conversationId.startsWith('dm-')
  const otherId = isDM ? conversationId.replace('dm-', '') : null
  const groupId = !isDM ? conversationId.replace('group-', '') : null

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime
  useEffect(() => {
    const table  = isDM ? 'direct_messages' : 'group_messages'
    const filter = isDM
      ? `or(and(sender_id=eq.${currentUserId},receiver_id=eq.${otherId}),and(sender_id=eq.${otherId},receiver_id=eq.${currentUserId}))`
      : `chat_id=eq.${groupId}`

    const channel = supabase.channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, async payload => {
        // Enrichir avec le profil expéditeur
        const { data: sender } = await supabase
          .from('profiles').select('id,username,display_name,avatar_url')
          .eq('id', payload.new.sender_id).single()
        const msg: Message = { ...payload.new as any, sender }
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  async function send() {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')

    // Optimistic
    const optimistic: Message = {
      id: `opt-${Date.now()}`, content, created_at: new Date().toISOString(),
      sender: { id: currentUserId, username: currentUserProfile?.username ?? '', display_name: currentUserProfile?.display_name ?? null, avatar_url: currentUserProfile?.avatar_url ?? null },
    }
    setMessages(prev => [...prev, optimistic])

    try {
      if (isDM) {
        await supabase.from('direct_messages').insert({
          sender_id: currentUserId, receiver_id: otherId, content,
        })
      } else {
        await supabase.from('group_messages').insert({
          chat_id: groupId, sender_id: currentUserId, content,
        })
      }
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setText(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Grouper les messages consécutifs du même expéditeur
  const grouped = messages.reduce<{ senderId: string; messages: Message[] }[]>((acc, msg) => {
    const last = acc[acc.length - 1]
    if (last && last.senderId === msg.sender?.id) { last.messages.push(msg); return acc }
    return [...acc, { senderId: msg.sender?.id ?? '', messages: [msg] }]
  }, [])

  const title = isDM
    ? (otherProfile?.display_name ?? otherProfile?.username)
    : groupChat?.name

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
        {isDM ? (
          otherProfile?.avatar_url
            ? <img src={otherProfile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            : <span className="avatar-md">{getInitials(otherProfile?.display_name ?? otherProfile?.username)}</span>
        ) : (
          <span className="avatar-md"><Users size={16} /></span>
        )}
        <div>
          <p className="font-semibold text-primary">{title}</p>
          {isDM && <p className="text-xs text-muted">@{otherProfile?.username}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {grouped.length === 0 && (
          <div className="text-center py-16 text-muted text-sm">
            Début de la conversation avec {title}.
          </div>
        )}

        {grouped.map((group, gi) => {
          const isMe = group.senderId === currentUserId
          const first = group.messages[0]
          const sender = first.sender
          return (
            <div key={gi} className={cn('flex gap-3', isMe && 'flex-row-reverse')}>
              {/* Avatar */}
              {!isMe && (
                sender?.avatar_url
                  ? <img src={sender.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  : <span className="avatar-sm flex-shrink-0 mt-0.5">{getInitials(sender?.display_name ?? sender?.username)}</span>
              )}

              <div className={cn('max-w-[70%] space-y-1', isMe && 'items-end flex flex-col')}>
                {!isMe && (
                  <p className="text-xs text-muted px-1">{sender?.display_name ?? sender?.username}</p>
                )}
                {group.messages.map((msg, mi) => (
                  <div key={msg.id}>
                    <div className={cn(
                      'px-3.5 py-2 rounded-2xl text-sm',
                      isMe
                        ? 'bg-[rgb(var(--color-accent))] text-white rounded-tr-sm'
                        : 'bg-surface-2 text-primary rounded-tl-sm',
                      mi === 0 && isMe && 'rounded-tr-2xl',
                      mi === 0 && !isMe && 'rounded-tl-2xl',
                    )}>
                      {msg.content}
                    </div>
                    {mi === group.messages.length - 1 && (
                      <p className={cn('text-[10px] text-muted px-1 mt-0.5', isMe && 'text-right')}>
                        {timeAgo(msg.created_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-4 border-t border-border mt-4">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Message ${isDM ? otherProfile?.display_name ?? otherProfile?.username : title}…`}
          rows={1}
          className="input resize-none flex-1 min-h-[42px] max-h-28 py-2.5"
          style={{ height: 'auto' }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement
            t.style.height = 'auto'
            t.style.height = `${Math.min(t.scrollHeight, 112)}px`
          }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="btn-primary p-2.5 self-end rounded-xl"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
