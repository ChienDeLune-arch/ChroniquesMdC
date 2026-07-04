'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, Heart, Loader2, Lock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ContributeModalProps {
  projectId:    string
  projectTitle: string
  currency:     string
  minAmount?:   number
  fixedAmount?: number
  tierId?:      string
  isLoggedIn:   boolean
  trigger?:     boolean
  defaultOpen?: boolean
  onClose?:     () => void
}

export function ContributeModal({
  projectId, projectTitle, currency, minAmount = 100,
  fixedAmount, tierId, isLoggedIn,
  trigger = true, defaultOpen = false, onClose,
}: ContributeModalProps) {
  const router = useRouter()
  const [open,           setOpen]           = useState(defaultOpen)
  const [amount,         setAmount]         = useState(fixedAmount ?? minAmount)
  const [clientSecret,   setClientSecret]   = useState<string | null>(null)
  const [loadingIntent,  setLoadingIntent]  = useState(false)
  const [anonymous,      setAnonymous]      = useState(false)
  const [message,        setMessage]        = useState('')
  const [step,           setStep]           = useState<'amount' | 'payment' | 'success'>('amount')

  function close() { setOpen(false); setStep('amount'); setClientSecret(null); onClose?.() }

  async function createIntent() {
    if (!isLoggedIn) {
      toast.info('Connecte-toi pour contribuer')
      router.push(`/auth/login?redirect=/public/projects`)
      return
    }
    if (amount < minAmount) {
      toast.error(`Montant minimum : ${formatPrice(minAmount, currency)}`)
      return
    }
    setLoadingIntent(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, tier_id: tierId, anonymous, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setClientSecret(data.client_secret)
      setStep('payment')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingIntent(false)
    }
  }

  return (
    <>
      {/* Trigger */}
      {trigger && (
        <button
          onClick={() => setOpen(true)}
          className="btn-primary w-full gap-2"
        >
          <Heart size={16} />
          Soutenir ce projet
        </button>
      )}

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-surface-1 border border-border rounded-2xl shadow-2xl w-full max-w-md relative">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-primary">
                  {step === 'success' ? '🎉 Merci !' : 'Soutenir ce projet'}
                </h2>
                <p className="text-sm text-muted mt-0.5 line-clamp-1">{projectTitle}</p>
              </div>
              <button onClick={close} className="btn-ghost p-2 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {/* Étape 1 : choix du montant */}
              {step === 'amount' && (
                <div className="space-y-4">
                  {/* Montant */}
                  {fixedAmount ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted mb-1">Montant</p>
                      <p className="text-3xl font-semibold text-primary">
                        {formatPrice(fixedAmount, currency)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="label">Montant (minimum {formatPrice(minAmount, currency)})</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount / 100}
                          onChange={e => setAmount(Math.round(parseFloat(e.target.value) * 100))}
                          min={minAmount / 100}
                          step="1"
                          className="input pr-10 text-lg font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-medium">
                          {currency.toUpperCase()}
                        </span>
                      </div>
                      {/* Montants rapides */}
                      <div className="flex gap-2 mt-2">
                        {[500, 1000, 2500, 5000].filter(a => a >= minAmount).map(a => (
                          <button
                            key={a}
                            onClick={() => setAmount(a)}
                            className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                              amount === a
                                ? 'border-[rgb(var(--color-accent))] bg-accent-light text-[rgb(var(--color-accent))] font-medium'
                                : 'border-border text-muted hover:text-secondary'
                            }`}
                          >
                            {formatPrice(a, currency)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <label className="label">Message (optionnel)</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Un mot d'encouragement…"
                      rows={2}
                      maxLength={200}
                      className="input resize-none text-sm"
                    />
                  </div>

                  {/* Anonymat */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={e => setAnonymous(e.target.checked)}
                      className="w-4 h-4 rounded accent-[rgb(var(--color-accent))]"
                    />
                    <span className="text-sm text-secondary">Contribuer anonymement</span>
                  </label>

                  <button
                    onClick={createIntent}
                    disabled={loadingIntent || amount < minAmount}
                    className="btn-primary w-full gap-2 mt-2"
                  >
                    {loadingIntent
                      ? <><Loader2 size={16} className="animate-spin" />Préparation…</>
                      : <><Heart size={16} />Contribuer {formatPrice(fixedAmount ?? amount, currency)}</>
                    }
                  </button>
                </div>
              )}

              {/* Étape 2 : paiement Stripe */}
              {step === 'payment' && clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'flat',
                      variables: {
                        colorPrimary: '#6B5FE4',
                        fontFamily: 'system-ui, sans-serif',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    amount={fixedAmount ?? amount}
                    currency={currency}
                    onSuccess={() => setStep('success')}
                    onBack={() => { setStep('amount'); setClientSecret(null) }}
                  />
                </Elements>
              )}

              {/* Étape 3 : succès */}
              {step === 'success' && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    Contribution envoyée !
                  </h3>
                  <p className="text-secondary text-sm mb-6">
                    Merci pour ton soutien de{' '}
                    <strong>{formatPrice(fixedAmount ?? amount, currency)}</strong>.
                    Elle sera validée dans quelques instants.
                  </p>
                  <button onClick={close} className="btn-secondary">Fermer</button>
                </div>
              )}

              {/* Sécurité */}
              {step !== 'success' && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted mt-4">
                  <Lock size={11} />
                  Paiement sécurisé par Stripe
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---- Formulaire Stripe interne ----
function PaymentForm({
  amount, currency, onSuccess, onBack,
}: {
  amount:    number
  currency:  string
  onSuccess: () => void
  onBack:    () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Erreur de paiement')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {error && (
        <p className="text-sm text-danger bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          ← Retour
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="btn-primary flex-1 gap-2"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" />Traitement…</>
            : <>Payer {formatPrice(amount, currency)}</>
          }
        </button>
      </div>
    </form>
  )
}
