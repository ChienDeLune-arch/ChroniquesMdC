import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const tierSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  amount:      z.number().int().positive(),
  max_backers: z.number().int().positive().optional().nullable(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase  = await createClient()

  const { data, error } = await supabase
    .from('project_tiers')
    .select('*')
    .eq('project_id', slug)
    .order('amount', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase  = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Vérifier ownership
  const { data: project } = await supabase
    .from('projects')
    .select('creator_id')
    .eq('id', slug)
    .single()

  if (!project || project.creator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = tierSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('project_tiers')
    .insert({ ...parsed.data, project_id: slug })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase  = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tierId = new URL(req.url).searchParams.get('tier_id')
  if (!tierId) return NextResponse.json({ error: 'tier_id required' }, { status: 400 })

  // Vérifier ownership
  const { data: project } = await supabase
    .from('projects').select('creator_id').eq('id', slug).single()
  if (!project || project.creator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('project_tiers').delete().eq('id', tierId).eq('project_id', slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
