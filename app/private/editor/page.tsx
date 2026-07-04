import { redirect } from 'next/navigation'
import { getCurrentUser, createClient } from '@/lib/supabase/server'
import { PostEditorForm } from '@/components/blog/PostEditorForm'
import type { Tag } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditorPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/auth/login?redirect=/private/editor')
  if (current.profile?.role !== 'admin') redirect('/private/dashboard')

  const supabase = await createClient()
  const { data: availableTags } = await supabase
    .from('tags').select('id, name, slug, color').order('name')

  return (
    <PostEditorForm
      initialPost={null}
      availableTags={(availableTags ?? []) as Tag[]}
      userId={current.user.id}
    />
  )
}