import type { Metadata } from 'next'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { PricingCard } from '@/components/subscription/PricingCard'
import { CheckCircle2, Sparkles } from 'lucide-react'

export const metadata: Metadata = { title: 'Abonnement', description: 'Accède à la partie privée.' }

const PERKS = [
  'Accès à tout le contenu privé',
  'Chat direct et groupes',
  'Téléchargement des fichiers membres',
  'Participation aux discussions privées',
  'Sondages exclusifs',
  'Support prioritaire',
]

export default async function PricingPage() {
  const supabase = await createClient()
  const current  = await getCurrentUser()

  // Produits actifs
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('type', 'subscription')
    .order('price', { ascending: true })

  const hasAccess  = current?.profile?.private_access || current?.profile?.role === 'admin'
  const isLoggedIn = !!current

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">

      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-accent))] bg-accent-light rounded-full px-3 py-1 mb-4">
          <Sparkles size={14} />
          Accès membres
        </div>
        <h1 className="text-4xl font-semibold text-primary tracking-tight mb-4">
          Rejoins la communauté
        </h1>
        <p className="text-lg text-secondary max-w-xl mx-auto">
          Un abonnement pour accéder à tout le contenu exclusif, aux discussions privées et au chat.
        </p>
      </div>

      {/* Si déjà abonné */}
      {hasAccess && (
        <div className="surface-card p-6 text-center mb-10 border-green-200 dark:border-green-800">
          <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
          <h2 className="font-semibold text-primary mb-1">Tu as déjà accès à la partie privée</h2>
          <p className="text-secondary text-sm">
            <a href="/private/dashboard" className="text-[rgb(var(--color-accent))] hover:underline">
              Accéder au dashboard →
            </a>
          </p>
        </div>
      )}

      {/* Plans */}
      {products && products.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          {(products as any[]).map(p => (
            <PricingCard
              key={p.id}
              product={p}
              isLoggedIn={isLoggedIn}
              hasAccess={hasAccess}
            />
          ))}
        </div>
      ) : (
        /* Pas encore de produit Stripe configuré — accès gratuit pour les premiers */
        <div className="surface-card p-8 text-center mb-10 border-[rgb(var(--color-accent)/0.3)]">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-semibold text-primary mb-2">
            Accès gratuit pour les premiers membres
          </h2>
          <p className="text-secondary mb-6 max-w-md mx-auto">
            Le site est en cours de lancement. Les premiers inscrits obtiennent un accès complet gratuitement,
            sans carte bancaire.
          </p>
          {!isLoggedIn ? (
            <a href="/auth/register" className="btn-primary">
              S'inscrire gratuitement →
            </a>
          ) : !hasAccess ? (
            <a href="/private/dashboard" className="btn-primary">
              Demander l'accès gratuit →
            </a>
          ) : null}
        </div>
      )}

      {/* Ce qui est inclus */}
      <div className="surface-card p-6">
        <h3 className="font-semibold text-primary mb-4">Ce qui est inclus</h3>
        <ul className="grid sm:grid-cols-2 gap-2">
          {PERKS.map(perk => (
            <li key={perk} className="flex items-center gap-2 text-sm text-secondary">
              <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted mt-8">
        Paiements sécurisés par Stripe · Résiliation à tout moment · Sans engagement
      </p>
    </div>
  )
}
