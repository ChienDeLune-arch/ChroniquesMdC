import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/subscription/check-promo?code=EARLY50
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code')
  if (!code) return NextResponse.json({ valid: false }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('id, code, discount_pct, max_uses, used_count, valid_until, is_active')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (!promo) return NextResponse.json({ valid: false })

  // Vérifier expiration
  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  // Vérifier max_uses
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ valid: false, reason: 'exhausted' })
  }

  // Vérifier si déjà utilisé par cet utilisateur
  if (user) {
    const { data: used } = await supabase
      .from('promo_code_uses')
      .select('id').eq('code_id', promo.id).eq('user_id', user.id).single()
    if (used) return NextResponse.json({ valid: false, reason: 'already_used' })
  }

  return NextResponse.json({
    valid:        true,
    code:         promo.code,
    discount_pct: promo.discount_pct,
  })
}
