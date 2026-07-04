import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type } = await req.json()
  const VALID = ['like', 'heart', 'celebrate', 'insightful']
  if (!VALID.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // Vérifier si la réaction existe déjà
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, type')
    .eq('user_id', user.id)
    .eq('entity_type', 'post')
    .eq('entity_id', postId)
    .single()

  if (existing) {
    if (existing.type === type) {
      // Supprimer (toggle off)
      await supabase.from('reactions').delete().eq('id', existing.id)
      return NextResponse.json({ action: 'removed', type })
    } else {
      // Changer de réaction
      await supabase
        .from('reactions')
        .update({ type })
        .eq('id', existing.id)
      return NextResponse.json({ action: 'changed', type })
    }
  }

  // Nouvelle réaction
  await supabase.from('reactions').insert({
    user_id:     user.id,
    entity_type: 'post',
    entity_id:   postId,
    type,
  })
  return NextResponse.json({ action: 'added', type })
}
