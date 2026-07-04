'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    })
    setLoading(false)
        if (error) {
		toast.error(
		typeof error.message === 'string'
		  ? error.message
		  : 'Erreur lors de la mise à jour du mot de passe'
		)
		return
	}
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-4">📩</div>
          <h1 className="text-xl font-semibold text-primary mb-2">Email envoyé !</h1>
          <p className="text-secondary mb-6">
            Si <strong>{email}</strong> correspond à un compte, tu recevras un lien pour réinitialiser ton mot de passe.
          </p>
          <Link href="/auth/login" className="btn-secondary">
            <ArrowLeft size={15} />Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-0">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold">
            Chroniques<span className="text-[rgb(var(--color-accent))]">MdC</span>
          </Link>
          <p className="text-secondary mt-2">Réinitialiser le mot de passe</p>
        </div>

        <div className="surface-card p-6">
          <p className="text-sm text-secondary mb-4">
            Saisis ton adresse email. Si elle correspond à un compte, tu recevras un lien de réinitialisation.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email" type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                className="input" placeholder="toi@exemple.fr"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 size={16} className="animate-spin" />Envoi…</> : 'Envoyer le lien'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-secondary mt-4">
          <Link href="/auth/login" className="flex items-center justify-center gap-1 hover:text-primary transition-colors">
            <ArrowLeft size={14} />Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
