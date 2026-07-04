import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  username:     z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  display_name: z.string().min(1).max(100).optional().nullable(),
  bio:          z.string().max(500).optional().nullable(),
  website:      z.string().url().optional().nullable(),
  avatar_url:   z.string().url().optional().nullable(),
})

// GET — profil courant
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, website, avatar_url, role, is_verified, private_access, created_at')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH — mettre à jour le profil
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Si changement de pseudo, vérifier la disponibilité
  if (parsed.data.username) {
    const { data: available } = await supabase
      .rpc('is_username_available', { p_username: parsed.data.username })

    // Récupérer le pseudo actuel pour ne pas bloquer si c'est le même
    const { data: current } = await supabase
      .from('profiles').select('username').eq('id', user.id).single()

    if (!available && current?.username?.toLowerCase() !== parsed.data.username.toLowerCase()) {
      return NextResponse.json({ error: 'Ce pseudo est déjà pris' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('id, username, display_name, bio, website, avatar_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE — supprimer le compte
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Supprimer le profil (cascade supprime tout le contenu lié)
  // L'entrée auth.users sera supprimée via le trigger Supabase
  const { error } = await supabase.auth.admin.deleteUser(user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
