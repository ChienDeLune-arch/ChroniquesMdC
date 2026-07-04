import { createAdminClient } from '@/lib/supabase/server'
import { UsersTable } from '@/components/admin/UsersTable'

interface Props { searchParams: Promise<{ q?: string; role?: string; page?: string }> }

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q, role, page: pageParam } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1'))
  const limit   = 20
  const offset  = (page - 1) * limit
  const supabase = createAdminClient()

  let query = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, role, is_verified, created_at, stripe_customer_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q)    query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
  if (role && role !== 'all') query = query.eq('role', role)

  const { data: users, count } = await query
  const totalPages = Math.ceil((count ?? 0) / limit)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Utilisateurs</h1>
        <p className="text-secondary mt-1">{count ?? 0} membres au total</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form action="/admin/users" className="flex gap-2">
          <input type="search" name="q" defaultValue={q} placeholder="Rechercher…" className="input text-sm py-2 w-60" />
          {role && <input type="hidden" name="role" value={role} />}
          <button type="submit" className="btn-secondary btn-sm">Filtrer</button>
        </form>
        <div className="flex gap-1 bg-surface-1 border border-border rounded-lg p-1">
          {['all', 'admin', 'moderator', 'member'].map(r => (
            <a key={r} href={`/admin/users?role=${r}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${(role ?? 'all') === r ? 'bg-surface-0 text-primary font-medium shadow-sm' : 'text-secondary hover:text-primary'}`}>
              {r === 'all' ? 'Tous' : r}
            </a>
          ))}
        </div>
      </div>

      <UsersTable users={users ?? []} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && <a href={`/admin/users?page=${page-1}${q?`&q=${q}`:''}${role?`&role=${role}`:''}`} className="btn-secondary btn-sm">← Précédent</a>}
          <span className="text-sm text-muted self-center">Page {page} / {totalPages}</span>
          {page < totalPages && <a href={`/admin/users?page=${page+1}${q?`&q=${q}`:''}${role?`&role=${role}`:''}`} className="btn-secondary btn-sm">Suivant →</a>}
        </div>
      )}
    </div>
  )
}
