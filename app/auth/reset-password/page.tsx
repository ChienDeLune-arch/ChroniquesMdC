'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [ready,     setReady]     = useState(false)   // session récupérée depuis le lien email
  const [done,      setDone]      = useState(false)

  // Supabase envoie le token dans le hash de l'URL (#access_token=...)
  // onAuthStateChange le récupère automatiquement
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { toast.error('Minimum 8 caractères'); return }
    if (password !== confirm)  { toast.error('Les mots de passe ne correspondent pas'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { toast.error(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-xl font-semibold text-primary mb-2">Mot de passe mis à jour !</h1>
          <p className="text-secondary">Redirection vers la connexion…</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-[rgb(var(--color-accent))]" />
          <p className="text-secondary">Vérification du lien…</p>
          <p className="text-xs text-muted mt-2">
            Si rien ne se passe,{' '}
            <Link href="/auth/forgot-password" className="text-[rgb(var(--color-accent))] hover:underline">
              redemande un email
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-0">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold">
            Mon<span className="text-[rgb(var(--color-accent))]">Site</span>
          </Link>
          <p className="text-secondary mt-2">Nouveau mot de passe</p>
        </div>

        <div className="surface-card p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="password">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  id="password" type={showPwd ? 'text' : 'password'}
                  value={password} required minLength={8}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10" placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirmer</label>
              <input
                id="confirm" type={showPwd ? 'text' : 'password'}
                value={confirm} required
                onChange={e => setConfirm(e.target.value)}
                className="input" placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 size={16} className="animate-spin" />Mise à jour…</> : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
