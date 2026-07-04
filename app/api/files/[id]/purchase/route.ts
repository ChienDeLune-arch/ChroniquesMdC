import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentIntent, getOrCreateStripeCustomer } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  amount: z.number().int().positive().min(50),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Vérifier le fichier
  const { data: file } = await supabase
    .from('files')
    .select('id, title, pricing_type, price, currency, uploader_id')
    .eq('id', id)
    .single()

  if (!file) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
  if (file.pricing_type === 'free') {
    return NextResponse.json({ error: 'Ce fichier est gratuit' }, { status: 400 })
  }
  if (user.id === file.uploader_id) {
    return NextResponse.json({ error: 'Vous êtes le propriétaire' }, { status: 400 })
  }

  // Vérifier si déjà acheté
  const { data: existing } = await supabase
    .from('file_purchases')
    .select('id')
    .eq('file_id', id)
    .eq('buyer_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Déjà acheté' }, { status: 400 })

  // Montant : pour paid = prix fixe, pour pwyw = montant fourni
  const amount = file.pricing_type === 'paid'
    ? file.price
    : Math.max(parsed.data.amount, file.price || 50)

  // Customer Stripe
  const { data: profile } = await supabase
    .from('profiles').select('stripe_customer_id').eq('id', user.id).single()
  const { data: authData } = await supabase.auth.getUser()
  const customer = await getOrCreateStripeCustomer(
    user.id, authData.user?.email ?? '', profile?.stripe_customer_id
  )
  if (!profile?.stripe_customer_id && 'id' in customer) {
    await supabase.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)
  }

  // PaymentIntent
  const intent = await createPaymentIntent({
    amount,
    currency:   file.currency.toLowerCase(),
    customerId: 'id' in customer ? customer.id : undefined,
    metadata: {
      entity_type: 'file',
      entity_id:   file.id,
      buyer_id:    user.id,
    },
  })

  return NextResponse.json({ client_secret: intent.client_secret })
}
