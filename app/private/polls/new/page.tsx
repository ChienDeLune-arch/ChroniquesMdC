import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { PollEditorForm } from '@/components/polls/PollEditorForm'

export default async function NewPollPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/auth/login?redirect=/private/polls/new')

  return (
    <div className="px-4 py-8">
      <PollEditorForm userId={current.user.id} />
    </div>
  )
}