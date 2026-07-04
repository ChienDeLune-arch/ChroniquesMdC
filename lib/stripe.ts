import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

// Formater le prix en euros
export function formatPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

// Créer ou récupérer un customer Stripe
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
) {
  if (existingCustomerId) {
    return await stripe.customers.retrieve(existingCustomerId)
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  return customer
}

// Créer un Payment Intent pour un achat unique
export async function createPaymentIntent({
  amount,
  currency = 'eur',
  customerId,
  metadata,
}: {
  amount: number
  currency?: string
  customerId?: string
  metadata?: Record<string, string>
}) {
  return await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    metadata,
    automatic_payment_methods: { enabled: true },
  })
}

// Créer un abonnement
export async function createSubscription({
  customerId,
  priceId,
  trialDays,
  metadata,
}: {
  customerId: string
  priceId: string
  trialDays?: number
  metadata?: Record<string, string>
}) {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata,
  })
}

// Créer un produit + prix dans Stripe
export async function createStripeProduct({
  name,
  description,
  price,
  currency = 'eur',
  type = 'one_time',
  interval,
}: {
  name: string
  description?: string
  price: number
  currency?: string
  type?: 'one_time' | 'recurring'
  interval?: 'month' | 'year'
}) {
  const product = await stripe.products.create({ name, description })

  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: price,
    currency,
    recurring: type === 'recurring' && interval ? { interval } : undefined,
  })

  return { product, price: stripePrice }
}

// Construire l'événement Stripe depuis le webhook
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

// Générer un lien de portail client
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
) {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
