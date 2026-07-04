import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { ProjectEditorForm } from '@/components/projects/ProjectEditorForm'

export const metadata: Metadata = { title: 'Nouveau projet' }

export default async function NewProjectPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/auth/login')
  return <ProjectEditorForm userId={current!.user.id} />
}
