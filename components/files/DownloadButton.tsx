'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { toast } from 'sonner'
import { Download, Lock, CreditCard, Loader2, X, Heart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface DownloadButtonProps {
  fileId:       string
  pricingType:  string
  price:        number
  currency:     string
  hasPurchased: boolean
  isLoggedIn:   boolean
  isOwner:      boolean
}

export function DownloadButton({
  fileId, pricingType, price, currency,
  hasPurchased, isLoggedIn, isOwner,
}: DownloadButtonProps) {
  const router = useRouter()
  const [loading,      setLoading]      = useState(false)
  const [payOpen,      setPayOpen]      = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [pwywAmount,   setPwywAmount]   = useState(price || 100)

  // ---- Téléchargement direct ----
  async function download() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/files/${fileId}/download`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Déclencher le téléchargement
      const a = document.createElement('a')
      a.href  = data.url
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur téléchargement')
    } finally {
      setLoading(false)
    }
  }

  // ---- Paiement ----
  async function startPayment(amount: number) {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/public/files/${fileId}`)
      return
    }
    setLoading(true)
    try {
      const res  = await fetch(`/api/files/${fileId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClientSecret(data.client_secret)
      setPayOpen(true)
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  // ---- CAS : propriétaire ----
  if (isOwner) {
    return (
      <button onClick={download} disabled={loading} className="btn-primary w-full gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {loading ? 'Téléchargement…' : 'Télécharger (propriétaire)'}
      </button>
    )
  }

  // ---- CAS : gratuit ----
  if (pricingType === 'free') {
    if (!isLoggedIn) {
      return (
        <button
          onClick={() => router.push(`/auth/login?redirect=/public/files/${fileId}`)}
          className="btn-secondary w-full gap-2"
        >
          <Lock size={16} />
          Se connecter pour télécharger
        </button>
      )
    }
    return (
      <button onClick={download} disabled={loading} className="btn-primary w-full gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {loading ? 'Téléchargement…' : 'Télécharger gratuitement'}
      </button>
    )
  }

  // ---- CAS : déjà acheté ----
  if (hasPurchased) {
    return (
      <button onClick={download} disabled={loading} className="btn-primary w-full gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {loading ? 'Téléchargement…' : 'Télécharger'}
      </button>
    )
  }

  // ---- CAS : prix libre (PWYW) ----
  if (pricingType === 'pwyw') {
    return (
      <>
        <div className="space-y-3">
          <div>
            <label className="label text-xs">Ton montant ({currency})</label>
            <div className="relative">
              <input
                type="number"
                value={pwywAmount / 100}
                onChange={e => setPwywAmount(Math.round(parseFloat(e.target.value || '0') * 100))}
                min={price > 0 ? price / 100 : 0}
                step="1"
                className="input pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">{currency}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[100, 500, 1000, 2500].filter(a => a >= (price || 0)).map(a => (
              <button
                key={a}
                onClick={() => setPwywAmount(a)}
                className={`flex-1 py-1 text-xs rounded-md border transition-colors ${
                  pwywAmount === a
                    ? 'border-[rgb(var(--color-accent))] bg-accent-light text-[rgb(var(--color-accent))]'
                    : 'border-border text-muted'
                }`}
              >
                {formatPrice(a, currency)}
              </button>
            ))}
          </div>
          <button
            onClick={() => pwywAmount === 0 ? download() : startPayment(pwywAmount)}
            disabled={loading}
            className="btn-primary w-full gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
            {loading ? 'Traitement…' : pwywAmount === 0 ? 'Télécharger gratuitement' : `Payer ${formatPrice(pwywAmount, currency)}`}
          </button>
        </div>

        {payOpen && clientSecret && (
          <PaymentModal
            clientSecret={clientSecret}
            amount={pwywAmount}
            currency={currency}
            onSuccess={() => { setPayOpen(false); download() }}
            onClose={() => setPayOpen(false)}
          />
        )}
      </>
    )
  }

  // ---- CAS : payant ----
  return (
    <>
      <button
        onClick={() => startPayment(price)}
        disabled={loading}
        className="btn-primary w-full gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {loading ? 'Traitement…' : `Acheter — ${formatPrice(price, currency)}`}
      </button>

      {payOpen && clientSecret && (
        <PaymentModal
          clientSecret={clientSecret}
          amount={price}
          currency={currency}
          onSuccess={() => { setPayOpen(false); download() }}
          onClose={() => setPayOpen(false)}
        />
      )}
    </>
  )
}

// ---- Modal paiement ----
function PaymentModal({
  clientSecret, amount, currency, onSuccess, onClose,
}: {
  clientSecret: string
  amount:       number
  currency:     string
  onSuccess:    () => void
  onClose:      () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-1 border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-primary">Paiement sécurisé</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5">
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat', variables: { colorPrimary: '#6B5FE4', borderRadius: '8px' } } }}>
            <StripeForm amount={amount} currency={currency} onSuccess={onSuccess} />
          </Elements>
        </div>
      </div>
    </div>
  )
}

function StripeForm({ amount, currency, onSuccess }: { amount: number; currency: string; onSuccess: () => void }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })
    if (stripeError) { setError(stripeError.message ?? 'Erreur'); setLoading(false) }
    else onSuccess()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={!stripe || loading} className="btn-primary w-full gap-2">
        {loading ? <><Loader2 size={15} className="animate-spin" />Traitement…</> : <>Payer {formatPrice(amount, currency)}</>}
      </button>
    </form>
  )
}
