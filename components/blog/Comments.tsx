'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import { Send, CornerDownRight, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Comment, Profile } from '@/lib/types'

interface CommentsProps {
  postId:      string
  userId:      string | null
  userProfile: Profile | null
}

type CommentWithReplies = Comment & { replies: Comment[] }

export function Comments({ postId, userId, userProfile }: CommentsProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [loading,  setLoading]  = useState(true)
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [replyTo,  setReplyTo]  = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        async payload => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', payload.new.author_id)
            .single()

          const comment: CommentWithReplies = {
            id:          payload.new.id as string,
            post_id:     payload.new.post_id as string,
            parent_id:   payload.new.parent_id as string | null,
            content:     payload.new.content as string,
            author_id:   payload.new.author_id as string,
            is_approved: payload.new.is_approved as boolean,
            created_at:  payload.new.created_at as string,
            updated_at:  payload.new.updated_at as string,
            author:      (profile ?? undefined) as any,
            replies:     [] as Comment[],
          }

          setComments(prev => {
            if (comment.parent_id) {
              return prev.map(c =>
                c.id === comment.parent_id
                  ? { ...c, replies: [...(c.replies ?? []), comment] }
                  : c
              )
            }
            if (prev.some(c => c.id === comment.id)) return prev
            return [...prev, comment]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [postId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select(`
        id, post_id, parent_id, content, created_at, updated_at, is_approved, author_id,
        author:profiles(id, username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .eq('is_approved', true)
      .order('created_at', { ascending: true })

    if (data) {
      const byId: Record<string, CommentWithReplies> = {}
      for (const c of data) {
        byId[c.id] = {
          id:          c.id,
          post_id:     c.post_id,
          parent_id:   c.parent_id,
          content:     c.content,
          author_id:   c.author_id,
          is_approved: c.is_approved,
          created_at:  c.created_at,
          updated_at:  c.updated_at,
          author:      (Array.isArray(c.author) ? c.author[0] : c.author)  as any,
          replies:     [] as Comment[],
        }
      }
      const roots: CommentWithReplies[] = []
      for (const c of Object.values(byId)) {
        if (c.parent_id && byId[c.parent_id]) {
          byId[c.parent_id].replies.push(c)
        } else if (!c.parent_id) {
          roots.push(c)
        }
      }
      setComments(roots)
    }
    setLoading(false)
  }

  async function submit(parentId: string | null = null) {
    if (!text.trim() || sending) return
    if (!userId) { toast.info('Connecte-toi pour commenter'); return }

    setSending(true)
    const optimisticId = `opt-${Date.now()}`
    const optimistic: CommentWithReplies = {
      id:          optimisticId,
      post_id:     postId,
      parent_id:   parentId,
      content:     text.trim(),
      author_id:   userId,
      is_approved: true,
      created_at:  new Date().toISOString(),
      updated_at:  new Date().toISOString(),
      author:      userProfile ?? undefined,
      replies:     [] as Comment[],
    }

    if (parentId) {
      setComments(prev => prev.map(c =>
        c.id === parentId ? { ...c, replies: [...c.replies, optimistic] } : c
      ))
    } else {
      setComments(prev => [...prev, optimistic])
    }
    setText('')
    setReplyTo(null)

    const res = await fetch(`/api/posts/${postId}/comments`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: text.trim(), parent_id: parentId }),
    })

    setSending(false)
    if (!res.ok) {
      toast.error("Erreur lors de l'envoi.")
      setComments(prev => {
        if (parentId) return prev.map(c => ({ ...c, replies: c.replies.filter(r => r.id !== optimisticId) }))
        return prev.filter(c => c.id !== optimisticId)
      })
    }
  }

  async function deleteComment(id: string, parentId: string | null) {
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression'); return }
    setComments(prev => {
      if (parentId) return prev.map(c => ({ ...c, replies: c.replies.filter(r => r.id !== id) }))
      return prev.filter(c => c.id !== id)
    })
    toast.success('Commentaire supprimé')
  }

  const totalCount = comments.reduce((s, c) => s + 1 + c.replies.length, 0)

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-6">
        {totalCount} commentaire{totalCount !== 1 ? 's' : ''}
      </h2>

      <CommentInput
        userId={userId}
        value={replyTo ? '' : text}
        onChange={setText}
        onSubmit={() => submit(null)}
        sending={sending}
        placeholder="Laisse un commentaire…"
        userProfile={userProfile}
      />

      <div className="mt-8 space-y-6">
        {loading && (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-surface-2 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-2 rounded w-32" />
                  <div className="h-3 bg-surface-2 rounded w-3/4" />
                  <div className="h-3 bg-surface-2 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && comments.length === 0 && (
          <p className="text-muted text-sm text-center py-6">Sois le premier à commenter.</p>
        )}

        {comments.map(comment => (
          <CommentThread
            key={comment.id}
            comment={comment}
            userId={userId}
            userProfile={userProfile}
            replyTo={replyTo}
            replyText={text}
            onSetReplyTo={setReplyTo}
            onReplyTextChange={setText}
            onSubmitReply={(pid) => submit(pid)}
            onDelete={deleteComment}
            sending={sending}
          />
        ))}
      </div>
    </section>
  )
}

function CommentThread({
  comment, userId, userProfile, replyTo, replyText,
  onSetReplyTo, onReplyTextChange, onSubmitReply, onDelete, sending,
}: {
  comment:           CommentWithReplies
  userId:            string | null
  userProfile:       Profile | null
  replyTo:           string | null
  replyText:         string
  onSetReplyTo:      (id: string | null) => void
  onReplyTextChange: (v: string) => void
  onSubmitReply:     (parentId: string) => void
  onDelete:          (id: string, parentId: string | null) => void
  sending:           boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const canDelete = userId === comment.author_id

  return (
    <div>
      <CommentRow
        comment={comment}
        canDelete={canDelete}
        onDelete={() => onDelete(comment.id, null)}
        onReply={() => onSetReplyTo(replyTo === comment.id ? null : comment.id)}
        isReplying={replyTo === comment.id}
      />

      {comment.replies.length > 0 && (
        <div className="ml-10 mt-3">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex items-center gap-1 text-xs text-muted mb-2 hover:text-secondary"
          >
            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            {comment.replies.length} réponse{comment.replies.length > 1 ? 's' : ''}
          </button>
          {!collapsed && (
            <div className="space-y-4 pl-4 border-l border-border">
              {comment.replies.map(reply => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  canDelete={userId === reply.author_id}
                  onDelete={() => onDelete(reply.id, comment.id)}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      )}

      {replyTo === comment.id && (
        <div className="ml-10 mt-3 pl-4 border-l border-border">
          <CommentInput
            userId={userId}
            value={replyText}
            onChange={onReplyTextChange}
            onSubmit={() => onSubmitReply(comment.id)}
            sending={sending}
            placeholder={`Répondre à ${comment.author?.display_name ?? comment.author?.username ?? 'ce commentaire'}…`}
            userProfile={userProfile}
            compact
          />
        </div>
      )}
    </div>
  )
}

function CommentRow({
  comment, canDelete, onDelete, onReply, isReplying = false, isReply = false,
}: {
  comment:     Comment & { author?: any }
  canDelete:   boolean
  onDelete:    () => void
  onReply?:    () => void
  isReplying?: boolean
  isReply?:    boolean
}) {
  return (
    <div className="flex gap-3">
      {comment.author?.avatar_url ? (
        <img src={comment.author.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <span className="avatar-sm flex-shrink-0">
          {getInitials(comment.author?.display_name ?? comment.author?.username)}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium text-primary">
            {comment.author?.display_name ?? comment.author?.username ?? 'Anonyme'}
          </span>
          <span className="text-xs text-muted">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-primary whitespace-pre-wrap break-words">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {onReply && !isReply && (
            <button onClick={onReply}
              className={cn('text-xs transition-colors flex items-center gap-1',
                isReplying ? 'text-[rgb(var(--color-accent))]' : 'text-muted hover:text-secondary'
              )}>
              <CornerDownRight size={11} />
              {isReplying ? 'Annuler' : 'Répondre'}
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete}
              className="text-xs text-muted hover:text-danger transition-colors flex items-center gap-1">
              <Trash2 size={11} />Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentInput({
  userId, value, onChange, onSubmit, sending, placeholder, userProfile, compact = false,
}: {
  userId:      string | null
  value:       string
  onChange:    (v: string) => void
  onSubmit:    () => void
  sending:     boolean
  placeholder: string
  userProfile: Profile | null
  compact?:    boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmit()
  }

  if (!userId) {
    return (
      <div className="p-4 surface-card text-center text-sm text-secondary">
        <a href="/auth/login" className="text-[rgb(var(--color-accent))] underline">Connecte-toi</a>{' '}
        pour laisser un commentaire.
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      {!compact && (
        <span className="avatar-sm flex-shrink-0">
          {userProfile?.avatar_url
            ? <img src={userProfile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            : getInitials(userProfile?.display_name ?? userProfile?.username)
          }
        </span>
      )}
      <div className="flex-1">
        <textarea ref={textareaRef} value={value} onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey} placeholder={placeholder} rows={compact ? 2 : 3}
          className="input resize-none w-full" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted">Ctrl+Entrée pour envoyer</span>
          <button onClick={onSubmit} disabled={!value.trim() || sending} className="btn-primary btn-sm">
            <Send size={13} />{sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}
