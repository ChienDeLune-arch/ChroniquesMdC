import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  member_ids:  z.array(z.string().uuid()).min(1),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { member_ids, ...fields } = parsed.data
  const { data: group, error } = await supabase
    .from('group_chats').insert({ ...fields, created_by: user.id }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ajouter l'admin + les membres
  const allMembers = Array.from(new Set([user.id, ...member_ids]))
  await supabase.from('group_chat_members').insert(
    allMembers.map(pid => ({
      chat_id: group.id, profile_id: pid,
      role: pid === user.id ? 'admin' : 'member',
    }))
  )

  // Notifier les membres
  await supabase.from('notifications').insert(
    member_ids.filter(id => id !== user.id).map(uid => ({
      user_id: uid, type: 'group_invite', title: `Ajouté au groupe « ${fields.name} »`,
      link: `/private/chat/group-${group.id}`,
    }))
  )

  return NextResponse.json({ data: group }, { status: 201 })
}
