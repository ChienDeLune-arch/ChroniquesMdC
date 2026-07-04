import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { PostEditorForm } from '@/components/blog/PostEditorForm'
import type { Metadata } from 'next'
import type { Tag } from '@/lib/types'

export const metadata: Metadata = { title: 'Écrire' }

interface Props {
  params?: Promise<{ id?: string }>
}

export default async function EditorPage({ params }: Props) {
  const current = await getCurrentUser()
	if (!current) redirect('/auth/login?redirect=/private/editor')
	if (current.profile?.role !== 'admin') redirect('/private/dashboard')

  const resolvedParams = params ? await params : {}
  const postId = (resolvedParams as { id?: string }).id

  const supabase = await createClient()
  let initialPost = null

  if (postId) {
    // 1. Le post seul
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, slug, content, excerpt, cover_image, type, status, visibility, allow_comments')
      .eq('id', postId)
      .eq('author_id', current.user.id)
      .single()

    if (post) {
      // 2. Les IDs des tags liés
      const { data: postTags } = await supabase
        .from('post_tags')
        .select('tag_id')
        .eq('post_id', postId)

      // Extraire le tableau d'IDs depuis la réponse
      const tagIds = (postTags ?? []).map((pt: { tag_id: string }) => pt.tag_id)

      // 3. Les tags complets
      let tags: Tag[] = []
      if (tagIds.length > 0) {
        const { data: tagData } = await supabase
          .from('tags')
          .select('id, name, slug, color')
          .in('id', tagIds)
        tags = (tagData ?? []) as Tag[]
      }

      initialPost = {
        ...post,
        post_tags: tags.map(tag => ({ tag })),
      }
    }
  }

  // Tags disponibles
  const { data: availableTags } = await supabase
    .from('tags')
    .select('id, name, slug, color')
    .order('name')

  return (
    <PostEditorForm
      initialPost={initialPost as any}
      availableTags={(availableTags ?? []) as Tag[]}
      userId={current.user.id}
    />
  )
}