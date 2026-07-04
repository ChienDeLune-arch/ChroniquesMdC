import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Récupérer le fichier
  const { data: file, error } = await supabase
    .from('files')
    .select('id, file_path, pricing_type, price, visibility, uploader_id')
    .eq('id', id)
    .single()

  if (error || !file) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
  }

  // Vérifications d'accès
  const isOwner = user?.id === file.uploader_id

  if (!isOwner) {
    // Visibilité membres
    if (file.visibility === 'members' && !user) {
      return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
    }
    if (file.visibility === 'private') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Fichier payant — vérifier l'achat
    if (file.pricing_type !== 'free') {
      if (!user) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
      const { data: purchase } = await supabase
        .from('file_purchases')
        .select('id')
        .eq('file_id', id)
        .eq('buyer_id', user.id)
        .single()

      if (!purchase) {
        return NextResponse.json({ error: 'Achat requis' }, { status: 403 })
      }
    }
  }

  // Générer une URL signée (valide 60 secondes)
  const { data: signed, error: signError } = await admin.storage
    .from('files')
    .createSignedUrl(file.file_path, 60, { download: true })

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Erreur génération URL' }, { status: 500 })
  }

  // Incrémenter le compteur (fire & forget)
  admin.rpc('increment_download_count', { file_id: id }).then(() => {})

  return NextResponse.json({ url: signed.signedUrl })
}

// Preview (sans download) pour images/audio/video
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return GET(req, { params })
}
