import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { PostEditorForm } from '@/components/blog/PostEditorForm'
import type { Tag } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params
  const current = await getCurrentUser()
  if (!current) redirect('/auth/login')
  if (current.profile?.role !== 'admin') redirect('/private/dashboard')

  const supabase = await createClient()

  // Post
  const { data: post } = await supabase
    .from('posts')
    .select('id, title, slug, content, excerpt, cover_image, type, status, visibility, allow_comments')
    .eq('id', id)
    .single()

  if (!post) redirect('/private/dashboard')

  // Tags du post
  const { data: postTags } = await supabase
    .from('post_tags').select('tag_id').eq('post_id', id)

  const tagIds = (postTags ?? []).map((pt: any) => pt.tag_id)
  let tags: Tag[] = []
  if (tagIds.length) {
    const { data: tagData } = await supabase
      .from('tags').select('id, name, slug, color').in('id', tagIds)
    tags = (tagData ?? []) as Tag[]
  }

  // Tags disponibles
  const { data: availableTags } = await supabase
    .from('tags').select('id, name, slug, color').order('name')

  return (
    <PostEditorForm
      initialPost={{ ...post, post_tags: tags.map(tag => ({ tag })) } as any}
      availableTags={(availableTags ?? []) as Tag[]}
      userId={current.user.id}
    />
  )
}