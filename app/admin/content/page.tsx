import { createAdminClient } from '@/lib/supabase/server'
import { ContentTable } from '@/components/admin/ContentTable'

interface Props { searchParams: Promise<{ type?: string; status?: string }> }

export const dynamic = 'force-dynamic'

export default async function AdminContentPage({ searchParams }: Props) {
  const { type = 'posts', status = 'all' } = await searchParams
  const supabase = createAdminClient()

  let data: any[] = []
  let count = 0

  if (type === 'posts') {
    let q = supabase.from('posts')
      .select('id, title, type, status, visibility, published_at, views, author:profiles(username,display_name)', { count: 'exact' })
      .order('created_at', { ascending: false }).limit(30)
    if (status !== 'all') q = q.eq('status', status)
    const res = await q
    data = res.data ?? []
    count = res.count ?? 0

  } else if (type === 'files') {
    const res = await supabase.from('files')
      .select('id, title, mime_type, pricing_type, price, visibility, download_count, created_at, uploader:profiles(username)', { count: 'exact' })
      .order('created_at', { ascending: false }).limit(30)
    data = res.data ?? []
    count = res.count ?? 0

  } else if (type === 'projects') {
    const res = await supabase.from('projects')
      .select('id, title, status, goal_amount, current_amount, currency, creator:profiles(username)', { count: 'exact' })
      .order('created_at', { ascending: false }).limit(30)
    data = res.data ?? []
    count = res.count ?? 0
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Contenu</h1>
        <p className="text-secondary mt-1">{count} élément{count > 1 ? 's' : ''}</p>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 bg-surface-1 border border-border rounded-lg p-1 mb-4 w-fit">
        {[{ v:'posts',l:'Articles'}, {v:'files',l:'Fichiers'}, {v:'projects',l:'Projets'}].map(({v,l}) => (
          <a key={v} href={`/admin/content?type=${v}`}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${type===v ? 'bg-surface-0 text-primary font-medium shadow-sm' : 'text-secondary hover:text-primary'}`}>
            {l}
          </a>
        ))}
      </div>

      {type === 'posts' && (
        <div className="flex gap-1 bg-surface-1 border border-border rounded-lg p-1 mb-6 w-fit">
          {['all','draft','published','archived'].map(s => (
            <a key={s} href={`/admin/content?type=posts&status=${s}`}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${status===s ? 'bg-surface-0 text-primary font-medium shadow-sm' : 'text-secondary hover:text-primary'}`}>
              {s === 'all' ? 'Tous' : s}
            </a>
          ))}
        </div>
      )}

      <ContentTable type={type} items={data} />
    </div>
  )
}
