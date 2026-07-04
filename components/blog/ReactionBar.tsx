'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const REACTIONS = [
  { type: 'like',       emoji: '👍', label: "J'aime" },
  { type: 'heart',      emoji: '❤️', label: 'Coup de cœur' },
  { type: 'celebrate',  emoji: '🎉', label: 'Bravo !' },
  { type: 'insightful', emoji: '💡', label: 'Inspirant' },
]

interface ReactionBarProps {
  postId:              string
  initialCounts:       Record<string, number>
  initialUserReaction: string | null
  isLoggedIn:          boolean
}

export function ReactionBar({
  postId, initialCounts, initialUserReaction, isLoggedIn,
}: ReactionBarProps) {
  const router = useRouter()
  const [counts, setCounts]       = useState(initialCounts)
  const [userRx, setUserRx]       = useState<string | null>(initialUserReaction)
  const [loading, setLoading]     = useState(false)

  const total = Object.values(counts).reduce((s, n) => s + n, 0)

  async function toggle(type: string) {
    if (!isLoggedIn) {
      toast.info('Connecte-toi pour réagir 👋', {
        action: { label: 'Connexion', onClick: () => router.push('/auth/login') },
      })
      return
    }
    if (loading) return
    setLoading(true)

    // Optimistic update
    const prev    = userRx
    const removing = prev === type

    setCounts(c => {
      const next = { ...c }
      if (prev && prev !== type) next[prev] = Math.max(0, (next[prev] ?? 0) - 1)
      if (removing) {
        next[type] = Math.max(0, (next[type] ?? 0) - 1)
      } else {
        next[type] = (next[type] ?? 0) + 1
      }
      return next
    })
    setUserRx(removing ? null : type)

    try {
      const res = await fetch(`/api/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Rollback
      setCounts(initialCounts)
      setUserRx(prev)
      toast.error('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-secondary mb-3">
        {total} réaction{total !== 1 ? 's' : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map(({ type, emoji, label }) => {
          const count   = counts[type] ?? 0
          const isActive = userRx === type
          return (
            <button
              key={type}
              onClick={() => toggle(type)}
              title={label}
              disabled={loading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all',
                isActive
                  ? 'bg-[rgb(var(--color-accent)/0.1)] border-[rgb(var(--color-accent)/0.4)] text-[rgb(var(--color-accent))] font-medium'
                  : 'border-border text-secondary hover:border-[rgb(var(--color-border-strong))] hover:text-primary',
                loading && 'opacity-60'
              )}
            >
              <span>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
