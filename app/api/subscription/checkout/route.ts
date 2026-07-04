import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { product_id, promo_code, success_url, cancel_url } = await req.json()

  // Récupérer le produit
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', product_id)
    .eq('is_active', true)
    .single()

  if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  if (!product.stripe_price_id) {
    return NextResponse.json({ error: 'Produit non configuré dans Stripe' }, { status: 400 })
  }

  // Customer Stripe
  const { data: profile } = await supabase
    .from('profiles').select('stripe_customer_id').eq('id', user.id).single()
  const customer = await getOrCreateStripeCustomer(
    user.id, user.email ?? '', profile?.stripe_customer_id
  )
  if (!profile?.stripe_customer_id && 'id' in customer) {
    await supabase.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)
  }

  // Résoudre le code promo → Stripe promotion_code ID
  let promotionCodeId: string | undefined
  if (promo_code) {
    // Vérifier dans notre DB
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promo_code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (promo) {
      // Code perso (remise manuelle) → appliquer via Stripe coupon créé à la volée
      const coupon = await stripe.coupons.create({
        percent_off:        promo.discount_pct,
        duration:           'once',
        name:               `Promo ${promo.code}`,
        max_redemptions:    1,
      })
      // Créer un promotion code Stripe associé
      const stripePromo = await stripe.promotionCodes.create({
        coupon:           coupon.id,
        code:             promo.code,
        max_redemptions:  1,
      })
      promotionCodeId = stripePromo.id

		// Après (correct pour Supabase JS v2)
		await supabase.from('promo_code_uses').upsert(
		  { code_id: promo.id, user_id: user.id },
		  { ignoreDuplicates: true }
		)
      await supabase.from('promo_codes')
        .update({ used_count: (promo.used_count ?? 0) + 1 })
        .eq('id', promo.id)
    }
  }

  // Créer la Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer:         'id' in customer ? customer.id : undefined,
    mode:             'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: product.stripe_price_id, quantity: 1 }],
    ...(promotionCodeId && { discounts: [{ promotion_code: promotionCodeId }] }),
    allow_promotion_codes: !promotionCodeId,  // permettre les codes Stripe natifs si pas de code perso
    success_url,
    cancel_url,
    metadata: {
      user_id:    user.id,
      product_id: product.id,
    },
  })

  return NextResponse.json({ url: session.url })
}
