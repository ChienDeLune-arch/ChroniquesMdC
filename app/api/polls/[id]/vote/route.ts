import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ option_ids: z.array(z.string().uuid()).min(1) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: poll } = await supabase
    .from('polls').select('id, status, allow_multiple, ends_at').eq('id', id).single()
  if (!poll) return NextResponse.json({ error: 'Sondage introuvable' }, { status: 404 })
  if (poll.status === 'closed') return NextResponse.json({ error: 'Sondage fermé' }, { status: 400 })
  if (poll.ends_at && new Date(poll.ends_at) < new Date())
    return NextResponse.json({ error: 'Sondage expiré' }, { status: 400 })

  const optionIds = poll.allow_multiple ? parsed.data.option_ids : [parsed.data.option_ids[0]]

  // Vérifier que les options appartiennent au sondage
  const { data: validOpts } = await supabase
    .from('poll_options').select('id').eq('poll_id', id).in('id', optionIds)
  if (!validOpts || validOpts.length !== optionIds.length)
    return NextResponse.json({ error: 'Options invalides' }, { status: 400 })

  // Supprimer les votes existants de cet utilisateur
  await supabase.from('poll_votes').delete().eq('poll_id', id).eq('voter_id', user.id)

  // Insérer les nouveaux votes
  const { error } = await supabase.from('poll_votes').insert(
    optionIds.map(option_id => ({ poll_id: id, option_id, voter_id: user.id }))
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('poll_votes').delete().eq('poll_id', id).eq('voter_id', user.id)
  return NextResponse.json({ success: true })
}
