import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {

      // ---- Paiement réussi (achat unique) ----
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const { entity_type, entity_id, buyer_id } = pi.metadata

        if (entity_type === 'file' && entity_id && buyer_id) {
          // Enregistrer l'achat du fichier
          await supabase.from('file_purchases').insert({
            file_id:                  entity_id,
            buyer_id,
            stripe_payment_intent_id: pi.id,
            amount_paid:              pi.amount,
          })
        }

        if (entity_type === 'project' && entity_id && buyer_id) {
          // Enregistrer la contribution
          await supabase.from('project_contributions').insert({
            project_id:              entity_id,
            contributor_id:          buyer_id,
            amount:                  pi.amount,
            stripe_payment_intent_id: pi.id,
          })
        }

        // Notifier l'utilisateur
        if (buyer_id) {
          await supabase.from('notifications').insert({
            user_id: buyer_id,
            type:    'purchase_success',
            title:   'Paiement confirmé',
            body:    `Votre paiement de ${(pi.amount / 100).toFixed(2)} € a été accepté.`,
          })
        }
        break
      }

      // ---- Abonnement créé / renouvelé ----
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        // Trouver l'utilisateur via stripe_customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          const productId = sub.metadata.product_id
          if (productId) {
            await supabase
              .from('user_products')
              .upsert({
                user_id:                profile.id,
                product_id:             productId,
                stripe_subscription_id: sub.id,
                stripe_customer_id:     customerId,
                status:                 sub.status === 'active' ? 'active' : sub.status,
                current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
              }, { onConflict: 'user_id,product_id' })
          }
        }
        break
      }

      // ---- Abonnement annulé ----
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription

        await supabase
          .from('user_products')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      // ---- Paiement d'abonnement échoué ----
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('user_products')
            .update({ status: 'past_due' })
            .eq('stripe_customer_id', customerId)
            .eq('status', 'active')

          await supabase.from('notifications').insert({
            user_id: profile.id,
            type:    'payment_failed',
            title:   'Paiement échoué',
            body:    'Votre paiement a échoué. Veuillez mettre à jour votre moyen de paiement.',
            link:    '/private/billing',
          })
        }
        break
      }

      default:
        console.log(`Événement non géré: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Erreur webhook:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
