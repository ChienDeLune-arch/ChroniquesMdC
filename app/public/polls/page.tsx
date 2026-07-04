import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { PollCard } from '@/components/polls/PollCard'
import { Plus, BarChart3 } from 'lucide-react'

export const metadata: Metadata = { title: 'Sondages' }

interface Props { searchParams: Promise<{ status?: string }> }

export default async function PollsPage({ searchParams }: Props) {
  const { status = 'active' } = await searchParams
  const supabase = await createClient()
  const current  = await getCurrentUser()

  let query = supabase
    .from('polls')
    .select(`
      id, title, description, allow_multiple, is_anonymous,
      show_results, ends_at, status, created_at, visibility,
      creator:profiles(id, username, display_name, avatar_url),
      poll_options(id, text, position)
    `, { count: 'exact' })
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(30)

  if (status !== 'all') query = query.eq('status', status)
  const { data: polls, count } = await query

  const ids = (polls ?? []).map((p: any) => p.id)
  const voteCounts: Record<string, number> = {}
  if (ids.length) {
    const { data: vs } = await supabase.from('poll_votes').select('poll_id').in('poll_id', ids)
    for (const v of vs ?? []) voteCounts[v.poll_id] = (voteCounts[v.poll_id] ?? 0) + 1
  }

  const userVotes: Record<string, string[]> = {}
  if (current && ids.length) {
    const { data: mv } = await supabase.from('poll_votes').select('poll_id, option_id')
      .eq('voter_id', current.user.id).in('poll_id', ids)
    for (const v of mv ?? []) userVotes[v.poll_id] = [...(userVotes[v.poll_id] ?? []), v.option_id]
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-primary tracking-tight">Sondages</h1>
          <p className="text-secondary mt-1">{count ?? 0} sondage{(count ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <Link href="/private/polls/new" className="btn-primary btn-sm">
          <Plus size={15} />Créer un sondage
        </Link>
      </div>
      <div className="flex gap-1 mb-8 bg-surface-1 border border-border rounded-lg p-1 w-fit">
        {[{ v: 'active', l: 'En cours' }, { v: 'closed', l: 'Fermés' }, { v: 'all', l: 'Tous' }].map(({ v, l }) => (
          <a key={v} href={`/public/polls?status=${v}`}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${status === v ? 'bg-surface-0 text-primary font-medium shadow-sm' : 'text-secondary hover:text-primary'}`}>
            {l}
          </a>
        ))}
      </div>
      {polls?.length ? (
        <div className="space-y-5">
          {(polls as any[]).map(poll => (
            <PollCard key={poll.id} poll={poll}
              totalVotes={voteCounts[poll.id] ?? 0}
              userVotedIds={userVotes[poll.id] ?? []}
              isLoggedIn={!!current} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <BarChart3 size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-muted">Aucun sondage pour le moment.</p>
          <Link href="/private/polls/new" className="btn-primary mt-4 inline-flex">Créer le premier →</Link>
        </div>
      )}
    </div>
  )
}
