import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { DiscussionEditorForm } from '@/components/discussions/DiscussionEditorForm'

export const metadata: Metadata = { title: 'Nouvelle discussion' }

export default async function NewDiscussionPage() {
  const current  = await getCurrentUser()
  const supabase = await createClient()

  const { data: tags } = await supabase
    .from('tags').select('id, name, slug, color, created_at').order('name')
	if (!current) redirect('/auth/login')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-primary mb-6">Nouvelle discussion</h1>
      <DiscussionEditorForm
        availableTags={tags ?? []}
        userId={current!.user.id}
      />
    </div>
  )
}
