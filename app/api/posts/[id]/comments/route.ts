import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  content:   z.string().min(1).max(4000),
  parent_id: z.string().uuid().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, post_id, parent_id, content, created_at,
      author:profiles(id, username, display_name, avatar_url)
    `)
    .eq('post_id', postId)
    .eq('is_approved', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Vérifier que le post existe et accepte les commentaires
  const { data: post } = await supabase
    .from('posts')
    .select('id, allow_comments')
    .eq('id', postId)
    .single()

  if (!post)                return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (!post.allow_comments) return NextResponse.json({ error: 'Comments disabled' }, { status: 403 })

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id:   postId,
      author_id: user.id,
      content:   parsed.data.content,
      parent_id: parsed.data.parent_id ?? null,
    })
    .select('id, content, created_at, parent_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifier l'auteur du post (si ce n'est pas lui qui commente)
  const { data: postRow } = await supabase
    .from('posts')
    .select('author_id, title, slug')
    .eq('id', postId)
    .single()

  if (postRow && postRow.author_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: postRow.author_id,
      type:    'comment',
      title:   'Nouveau commentaire',
      body:    `Sur : « ${postRow.title} »`,
      link:    `/public/blog/${postRow.slug}#${comment.id}`,
    })
  }

  return NextResponse.json({ data: comment }, { status: 201 })
}
