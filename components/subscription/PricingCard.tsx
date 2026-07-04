'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Tag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string; title: string; description: string | null
  price: number; currency: string; billing_interval: string | null
  metadata: { features?: string[] } | null
}

export function PricingCard({
  product, isLoggedIn, hasAccess,
}: {
  product:    Product
  isLoggedIn: boolean
  hasAccess:  boolean
}) {
  const router = useRouter()
  const [promoCode,  setPromoCode]  = useState('')
  const [showPromo,  setShowPromo]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [promoValid, setPromoValid] = useState<{ discount: number; label: string } | null>(null)
  const [checkingPromo, setCheckingPromo] = useState(false)

  const interval = product.billing_interval === 'year' ? 'an' : 'mois'
  const features = product.metadata?.features ?? []

  // Prix après promo
  const finalPrice = promoValid
    ? Math.round(product.price * (1 - promoValid.discount / 100))
    : product.price

  async function checkPromo() {
    if (!promoCode.trim()) return
    setCheckingPromo(true)
    try {
      const res  = await fetch(`/api/subscription/check-promo?code=${encodeURIComponent(promoCode)}`)
      const data = await res.json()
      if (!res.ok || !data.valid) {
        toast.error('Code promo invalide ou expiré')
        setPromoValid(null)
      } else {
        setPromoValid({ discount: data.discount_pct, label: data.code })
        toast.success(`Code appliqué : -${data.discount_pct}%`)
      }
    } catch {
      toast.error('Erreur de vérification')
    } finally {
      setCheckingPromo(false)
    }
  }

  async function subscribe() {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/public/pricing`)
      return
    }
    if (hasAccess) return

    setLoading(true)
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id:  product.id,
          promo_code:  promoValid ? promoCode : undefined,
          success_url: `${location.origin}/auth/callback?redirect=/private/dashboard`,
          cancel_url:  `${location.origin}/public/pricing`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url  // Stripe Checkout
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
      setLoading(false)
    }
  }

  const isYearly = product.billing_interval === 'year'

  return (
    <div className={`surface-card p-6 flex flex-col relative ${isYearly ? 'border-[rgb(var(--color-accent)/0.4)]' : ''}`}>
      {isYearly && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[rgb(var(--color-accent))] text-white text-xs font-medium px-3 py-1 rounded-full">
          Meilleure offre
        </div>
      )}

      <div className="mb-5">
        <h3 className="font-semibold text-primary text-lg">{product.title}</h3>
        {product.description && <p className="text-sm text-secondary mt-1">{product.description}</p>}
      </div>

      {/* Prix */}
      <div className="mb-5">
        {promoValid ? (
          <div>
            <span className="text-sm text-muted line-through">{formatPrice(product.price, product.currency)}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-green-600">{formatPrice(finalPrice, product.currency)}</span>
              <span className="text-secondary text-sm">/ {interval}</span>
            </div>
            <span className="badge bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mt-1">
              -{promoValid.discount}% avec « {promoValid.label} »
            </span>
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary">{formatPrice(product.price, product.currency)}</span>
            <span className="text-secondary text-sm">/ {interval}</span>
          </div>
        )}
      </div>

      {/* Features */}
      {features.length > 0 && (
        <ul className="space-y-2 mb-6 flex-1">
          {features.map((f: string) => (
            <li key={f} className="flex items-center gap-2 text-sm text-secondary">
              <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}

      {/* Code promo */}
      {!hasAccess && (
        <div className="mb-4">
          {showPromo ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoValid(null) }}
                placeholder="CODE PROMO"
                className="input text-sm py-2 font-mono tracking-wider flex-1"
                onKeyDown={e => e.key === 'Enter' && checkPromo()}
              />
              <button onClick={checkPromo} disabled={checkingPromo} className="btn-secondary btn-sm px-3">
                {checkingPromo ? <Loader2 size={14} className="animate-spin" /> : 'OK'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPromo(true)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-[rgb(var(--color-accent))] transition-colors"
            >
              <Tag size={12} />J'ai un code promo
            </button>
          )}
        </div>
      )}

      {/* CTA */}
      {hasAccess ? (
        <div className="flex items-center gap-2 justify-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-sm font-medium">
          <CheckCircle2 size={16} />Accès actif
        </div>
      ) : (
        <button onClick={subscribe} disabled={loading} className="btn-primary w-full gap-2">
          {loading
            ? <><Loader2 size={16} className="animate-spin" />Redirection…</>
            : <>S'abonner — {formatPrice(finalPrice, product.currency)}/{interval}</>
          }
        </button>
      )}
    </div>
  )
}
