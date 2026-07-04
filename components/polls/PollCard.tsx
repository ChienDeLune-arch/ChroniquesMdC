'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock, Users, CheckCircle2, Lock } from 'lucide-react'
import { timeAgo, getInitials, cn } from '@/lib/utils'

interface PollOption { id: string; text: string; position: number }
interface Poll {
  id: string; title: string; description: string | null
  allow_multiple: boolean; is_anonymous: boolean; show_results: string
  ends_at: string | null; status: string; created_at: string
  creator: { username: string; display_name: string | null; avatar_url: string | null } | null
  poll_options: PollOption[]
}

interface PollCardProps {
  poll: Poll; totalVotes: number; userVotedIds: string[]; isLoggedIn: boolean
}

export function PollCard({ poll, totalVotes, userVotedIds, isLoggedIn }: PollCardProps) {
  const router = useRouter()
  const [selected,   setSelected]   = useState<string[]>(userVotedIds)
  const [voted,      setVoted]      = useState(userVotedIds.length > 0)
  const [voteCount,  setVoteCount]  = useState(totalVotes)
  const [loading,    setLoading]    = useState(false)

  const options = [...poll.poll_options].sort((a, b) => a.position - b.position)
  const isClosed = poll.status === 'closed' || (poll.ends_at ? new Date(poll.ends_at) < new Date() : false)
  const daysLeft = poll.ends_at
    ? Math.max(0, Math.ceil((new Date(poll.ends_at).getTime() - Date.now()) / 86_400_000))
    : null

  // Afficher les résultats ?
  const showResults =
    isClosed ||
    poll.show_results === 'always' ||
    (poll.show_results === 'after_vote' && voted)

  // Comptes par option (approx depuis le total — le vrai count est sur la page détail)
  const optionVotes: Record<string, number> = {}
  if (voted && selected.length) {
    for (const opt of options) {
      optionVotes[opt.id] = selected.includes(opt.id) ? Math.max(1, Math.round(voteCount / options.length)) : 0
    }
  }

  function toggle(optionId: string) {
    if (!isLoggedIn) { router.push('/auth/login'); return }
    if (voted || isClosed) return
    if (poll.allow_multiple) {
      setSelected(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      )
    } else {
      setSelected([optionId])
    }
  }

  async function castVote() {
    if (!selected.length) { toast.error('Sélectionne une option'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_ids: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVoted(true)
      setVoteCount(c => c + 1)
      toast.success('Vote enregistré !')
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  async function removeVote() {
    setLoading(true)
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setVoted(false)
      setSelected([])
      setVoteCount(c => Math.max(0, c - 1))
      toast.success('Vote retiré')
    } catch {
      toast.error('Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="surface-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('badge', isClosed ? 'badge-neutral' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400')}>
              {isClosed ? 'Fermé' : 'En cours'}
            </span>
            {poll.allow_multiple && <span className="badge-neutral">Choix multiples</span>}
            {poll.is_anonymous && <span className="badge-neutral flex items-center gap-1"><Lock size={10} />Anonyme</span>}
          </div>
          <h3 className="font-semibold text-primary">{poll.title}</h3>
          {poll.description && <p className="text-sm text-secondary mt-0.5">{poll.description}</p>}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {options.map(opt => {
          const isSelected = selected.includes(opt.id)
          const votes = optionVotes[opt.id] ?? 0
          const pct   = showResults && voteCount > 0 ? Math.round((votes / voteCount) * 100) : 0

          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              disabled={voted || isClosed || loading}
              className={cn(
                'w-full text-left rounded-lg border transition-all relative overflow-hidden',
                isSelected && !showResults
                  ? 'border-[rgb(var(--color-accent))] bg-accent-light'
                  : 'border-border hover:border-[rgb(var(--color-border-strong))]',
                (voted || isClosed) && 'cursor-default'
              )}
            >
              {/* Barre résultat */}
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-[rgb(var(--color-accent)/0.1)] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    isSelected
                      ? 'border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]'
                      : 'border-border'
                  )}>
                    {isSelected && <CheckCircle2 size={10} className="text-white" />}
                  </span>
                  <span className="text-sm text-primary">{opt.text}</span>
                </div>
                {showResults && (
                  <span className="text-xs font-medium text-muted ml-2 flex-shrink-0">{pct}%</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><Users size={12} />{voteCount} vote{voteCount > 1 ? 's' : ''}</span>
          {daysLeft !== null && !isClosed && (
            <span className="flex items-center gap-1"><Clock size={12} />{daysLeft === 0 ? 'Dernier jour' : `${daysLeft}j`}</span>
          )}
          <span>{poll.creator?.display_name ?? poll.creator?.username}</span>
          <span>{timeAgo(poll.created_at)}</span>
        </div>

        {!voted && !isClosed && isLoggedIn && selected.length > 0 && (
          <button onClick={castVote} disabled={loading} className="btn-primary btn-sm">
            {loading ? 'Envoi…' : 'Voter'}
          </button>
        )}
        {voted && !isClosed && (
          <button onClick={removeVote} disabled={loading} className="btn-ghost btn-sm text-xs">
            Modifier mon vote
          </button>
        )}
        {!isLoggedIn && (
          <a href="/auth/login" className="text-xs text-[rgb(var(--color-accent))] hover:underline">
            Connexion pour voter
          </a>
        )}
      </div>
    </div>
  )
}
