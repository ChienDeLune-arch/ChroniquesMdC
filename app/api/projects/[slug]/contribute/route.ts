import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentIntent, getOrCreateStripeCustomer } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  amount:    z.number().int().positive().min(100),
  tier_id:   z.string().uuid().optional().nullable(),
  anonymous: z.boolean().default(false),
  message:   z.string().max(200).optional().nullable(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase  = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Vérifier le projet
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, status, goal_amount, stripe_product_id, creator_id')
    .eq('id', slug)   // accepte aussi l'ID direct
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.status !== 'active') {
    return NextResponse.json({ error: 'Project is not active' }, { status: 400 })
  }

  // Customer Stripe
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const { data: userEmail } = await supabase.auth.getUser()
  const customer = await getOrCreateStripeCustomer(
    user.id,
    userEmail.user?.email ?? '',
    profile?.stripe_customer_id
  )

  // Sauvegarder le customer_id si nouveau
  if (!profile?.stripe_customer_id && 'id' in customer) {
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id)
  }

  // PaymentIntent
  const intent = await createPaymentIntent({
    amount:     parsed.data.amount,
    currency:   'eur',
    customerId: 'id' in customer ? customer.id : undefined,
    metadata: {
      entity_type:  'project',
      entity_id:    project.id,
      buyer_id:     user.id,
      tier_id:      parsed.data.tier_id ?? '',
      is_anonymous: String(parsed.data.anonymous),
      message:      parsed.data.message ?? '',
    },
  })

  return NextResponse.json({
    client_secret: intent.client_secret,
    payment_intent_id: intent.id,
  })
}
