'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials, debounce } from '@/lib/utils'
import { toast } from 'sonner'
import { UserPlus, X, Search, Loader2 } from 'lucide-react'

interface InviteCoAuthorProps {
  postId:             string
  currentCoAuthorIds: string[]
}

interface Profile {
  id:           string
  username:     string
  display_name: string | null
  avatar_url:   string | null
}

export function InviteCoAuthor({ postId, currentCoAuthorIds }: InviteCoAuthorProps) {
  const supabase = createClient()

  const [open,      setOpen]      = useState(false)
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [coAuthors, setCoAuthors] = useState<Profile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Charger les co-auteurs actuels
  useEffect(() => {
    if (!currentCoAuthorIds.length) return
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', currentCoAuthorIds)
      .then(({ data }) => setCoAuthors(data ?? []))
  }, [currentCoAuthorIds.join(',')])

  const search = debounce(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(8)
    setResults((data ?? []).filter(
      p => !currentCoAuthorIds.includes(p.id) && !coAuthors.some(c => c.id === p.id)
    ))
    setSearching(false)
  }, 300)

  useEffect(() => { search(query) }, [query])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  async function addCoAuthor(profile: Profile) {
    const { error } = await supabase.from('post_authors').insert({
      post_id:    postId,
      profile_id: profile.id,
      role:       'co-author',
    })
    if (error) {
      toast.error('Erreur lors de l\'ajout')
      return
    }
    setCoAuthors(prev => [...prev, profile])
    setResults(prev => prev.filter(p => p.id !== profile.id))
    setQuery('')
    toast.success(`${profile.display_name ?? profile.username} ajouté comme co-auteur`)
  }

  async function removeCoAuthor(profileId: string) {
    const { error } = await supabase
      .from('post_authors')
      .delete()
      .eq('post_id', postId)
      .eq('profile_id', profileId)
    if (error) { toast.error('Erreur suppression'); return }
    setCoAuthors(prev => prev.filter(p => p.id !== profileId))
    toast.success('Co-auteur retiré')
  }

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted uppercase tracking-widest">
          Co-auteurs
        </h3>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-xs text-[rgb(var(--color-accent))] hover:underline"
        >
          <UserPlus size={12} />
          Inviter
        </button>
      </div>

      {/* Co-auteurs actifs */}
      {coAuthors.length > 0 ? (
        <ul className="space-y-2 mb-3">
          {coAuthors.map(a => (
            <li key={a.id} className="flex items-center gap-2">
              {a.avatar_url
                ? <img src={a.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <span className="avatar-sm">{getInitials(a.display_name ?? a.username)}</span>
              }
              <span className="text-xs text-primary flex-1 truncate">
                {a.display_name ?? a.username}
              </span>
              <button
                onClick={() => removeCoAuthor(a.id)}
                className="text-muted hover:text-danger transition-colors flex-shrink-0"
                title="Retirer"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted mb-3">Aucun co-auteur pour l'instant.</p>
      )}

      {/* Recherche */}
      {open && (
        <div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un membre…"
              className="input text-xs py-2 pl-7"
            />
            {searching && (
              <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted animate-spin" />
            )}
          </div>

          {results.length > 0 && (
            <ul className="mt-2 border border-border rounded-lg overflow-hidden">
              {results.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => addCoAuthor(p)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-1 transition-colors text-left"
                  >
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      : <span className="avatar-sm !w-5 !h-5 text-[9px]">{getInitials(p.display_name ?? p.username)}</span>
                    }
                    <span className="text-primary">{p.display_name ?? p.username}</span>
                    <span className="text-muted">@{p.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query && !searching && !results.length && (
            <p className="text-xs text-muted mt-2 text-center">Aucun résultat.</p>
          )}
        </div>
      )}
    </div>
  )
}
