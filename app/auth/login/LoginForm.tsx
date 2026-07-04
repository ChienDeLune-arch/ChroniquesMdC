'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Github, Loader2 } from 'lucide-react'

export default function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/private/dashboard'
  const supabase     = createClient()

  const [login,    setLogin]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let email = login.trim()

    if (!email.includes('@')) {
      const { data, error } = await supabase.rpc('get_email_by_username', {
        p_username: email.toLowerCase(),
      })
      if (error || !data) {
        toast.error('Pseudo introuvable.')
        setLoading(false)
        return
      }
      email = data as string
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        toast.error('Vérifie ta boîte mail pour confirmer ton compte.')
      } else {
        toast.error('Email/pseudo ou mot de passe incorrect.')
      }
      return
    }
    router.push(redirect)
    router.refresh()
  }

  async function loginWithGithub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${location.origin}/auth/callback?redirect=${redirect}` },
    })
  }

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?redirect=${redirect}` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-0">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold">
            Chroniques<span className="text-[rgb(var(--color-accent))]">MdC</span>
          </Link>
          <p className="text-secondary mt-2">Bon retour !</p>
        </div>

        <div className="surface-card p-6">
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="login">Email ou pseudo</label>
              <input
                id="login" type="text" value={login} required
                onChange={e => setLogin(e.target.value)}
                className="input" placeholder="jean_dupont ou toi@exemple.fr"
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="label mb-0" htmlFor="password">Mot de passe</label>
                <Link href="/auth/forgot-password" className="text-xs text-[rgb(var(--color-accent))] hover:underline">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPwd ? 'text' : 'password'}
                  value={password} required
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10" placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? <><Loader2 size={16} className="animate-spin" />Connexion…</>
                : 'Se connecter'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-secondary mt-4">
          Pas encore de compte ?{' '}
          <Link href="/auth/register" className="text-[rgb(var(--color-accent))] hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}
