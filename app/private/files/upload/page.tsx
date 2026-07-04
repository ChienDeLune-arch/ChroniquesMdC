import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { FileUploadForm } from '@/components/files/FileUploadForm'

export const metadata: Metadata = { title: 'Mettre en ligne un fichier' }

export default async function UploadPage() {
  const current  = await getCurrentUser()
  const supabase = await createClient()
  const { data: tags } = await supabase.from('tags').select('id, name, slug, color, created_at').order('name')
  if (!current) redirect('/auth/login')
  return <FileUploadForm userId={current!.user.id} availableTags={tags ?? []} />
}
