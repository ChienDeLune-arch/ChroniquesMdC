import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const dmSchema = z.object({
  receiver_id: z.string().uuid(),
  content:     z.string().min(1).max(4000),
})

// GET /api/chat/messages?with=userId
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const withId = new URL(req.url).searchParams.get('with')
  if (!withId) return NextResponse.json({ error: 'with param required' }, { status: 400 })

  const { data, error } = await supabase
    .from('direct_messages')
    .select('id, content, created_at, is_read, sender:profiles!direct_messages_sender_id_fkey(id,username,display_name,avatar_url)')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${withId}),and(sender_id.eq.${withId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/chat/messages
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = dmSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: user.id, ...parsed.data })
    .select('id, content, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
