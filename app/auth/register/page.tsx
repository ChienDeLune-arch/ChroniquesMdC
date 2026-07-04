'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn, debounce } from '@/lib/utils'

// Règles pseudo : 3-20 chars, lettres/chiffres/underscore/tiret
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/
const PASSWORD_MIN   = 8

export default function RegisterPage() {
  const supabase = createClient()

  const [email,     setEmail]     = useState('')
  const [username,  setUsername]  = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  // Disponibilité pseudo et email (debouncé)
  const [usernameOk,  setUsernameOk]  = useState<boolean | null>(null)
  const [emailOk,     setEmailOk]     = useState<boolean | null>(null)
  const [checkingU,   setCheckingU]   = useState(false)
  const [checkingE,   setCheckingE]   = useState(false)

	const checkUsername = debounce(async (val: string) => {
	  if (!USERNAME_REGEX.test(val)) { setUsernameOk(false); setCheckingU(false); return }
	  setCheckingU(true)
	  try {
		const { data, error } = await supabase.rpc('is_username_available', { p_username: val })
		if (error) {
		  setUsernameOk(null)
		} else {
		  setUsernameOk(!!data)
		}
	  } catch {
		setUsernameOk(null)
	  }
	  setCheckingU(false)
	}, 500)

	const checkEmail = debounce(async (val: string) => {
	  if (!val.includes('@')) { setEmailOk(null); setCheckingE(false); return }
	  setCheckingE(true)
	  try {
		const { data, error } = await supabase.rpc('is_email_available', { p_email: val })
		if (error) {
		  setEmailOk(null) // erreur RPC → on laisse passer, Supabase gèrera
		} else {
		  setEmailOk(!!data)
		}
	  } catch {
		setEmailOk(null) // erreur réseau → on laisse passer
	  }
	  setCheckingE(false)
	}, 500)

  // Force du mot de passe
  const pwdStrength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= PASSWORD_MIN)    score++
    if (password.length >= 12)              score++
    if (/[A-Z]/.test(password))            score++
    if (/[0-9]/.test(password))            score++
    if (/[^A-Za-z0-9]/.test(password))     score++
    return score
  })()

  const pwdMatch = confirm.length > 0 && password === confirm

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!USERNAME_REGEX.test(username)) {
      toast.error('Pseudo invalide (3-20 caractères, lettres/chiffres/_ /-)')
      return
    }
    if (usernameOk === false) { toast.error('Ce pseudo est déjà pris'); return }
    if (emailOk === false)    { toast.error('Cet email est déjà utilisé'); return }
    if (password.length < PASSWORD_MIN) {
      toast.error(`Mot de passe trop court (minimum ${PASSWORD_MIN} caractères)`)
      return
    }
    if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
	  email,
	  password,
	  options: {
		data: { username, display_name: username },
		emailRedirectTo: `${location.origin}/auth/callback`,
	  },
	})

	if (error) {
	  // Afficher le vrai message d'erreur pour débugger
	  console.error('SignUp error:', error)
	  toast.error(error.message ?? JSON.stringify(error))
	  setLoading(false)
	  return
	}
    setLoading(false)

    if (error) { toast.error((error as any).message ?? 'Erreur inscription'); return }
    setDone(true)
  }

  // ---- Écran de confirmation ----
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-semibold text-primary mb-2">Vérifie tes emails</h1>
          <p className="text-secondary mb-6">
            Un lien de confirmation a été envoyé à{' '}
            <strong className="text-primary">{email}</strong>.
            Clique dessus pour activer ton compte.
          </p>
          <p className="text-sm text-muted">
            Pas reçu ?{' '}
            <button
              onClick={() => supabase.auth.resend({ type: 'signup', email })}
              className="text-[rgb(var(--color-accent))] hover:underline"
            >
              Renvoyer le mail
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-surface-0">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold">
            Chroniques<span className="text-[rgb(var(--color-accent))]">MdC</span>
          </Link>
          <p className="text-secondary mt-2">Créer un compte</p>
        </div>

        <div className="surface-card p-6">
          <form onSubmit={onSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <input
                  id="email" type="email" value={email} required
                  onChange={e => {
					  const val = e.target.value
					  setEmail(val)
					  setEmailOk(null)
					  if (val.includes('@') && val.length > 5) {
						checkEmail(val)
					  }
					}}
                  className={cn('input pr-9', emailOk === false && 'border-danger focus:border-danger focus:ring-danger/40')}
                  placeholder="toi@exemple.fr"
                />
                <StatusIcon loading={checkingE} ok={emailOk} />
              </div>
              {emailOk === false && (
                <p className="text-xs text-danger mt-1">Cet email est déjà utilisé.</p>
              )}
            </div>

            {/* Pseudo */}
            <div>
              <label className="label" htmlFor="username">
                Pseudo
                <span className="text-muted font-normal ml-1">(3-20 chars, visible publiquement)</span>
              </label>
              <div className="relative">
                <input
                  id="username" type="text" value={username} required
                  onChange={e => {
					  const val = e.target.value.replace(/\s/g, '')
					  setUsername(val)
					  setUsernameOk(null)
					  if (val.length >= 3) checkUsername(val)
					}}
                  className={cn(
                    'input pr-9',
                    username && !USERNAME_REGEX.test(username) && 'border-danger focus:border-danger',
                    usernameOk === true && 'border-green-500 focus:border-green-500 focus:ring-green-500/40'
                  )}
                  placeholder="jean_dupont"
                  maxLength={20}
                />
                <StatusIcon loading={checkingU} ok={usernameOk} />
              </div>
              {username && !USERNAME_REGEX.test(username) && (
                <p className="text-xs text-danger mt-1">
                  3 à 20 caractères, lettres, chiffres, _ ou -
                </p>
              )}
              {usernameOk === true  && <p className="text-xs text-green-600 mt-1">✓ Pseudo disponible</p>}
              {usernameOk === false && USERNAME_REGEX.test(username) && (
				  <p className="text-xs text-danger mt-1">Ce pseudo est déjà pris.</p>
				)}
            </div>

            {/* Mot de passe */}
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <input
                  id="password" type={showPwd ? 'text' : 'password'}
                  value={password} required
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Barre de force */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        i <= pwdStrength
                          ? pwdStrength <= 2 ? 'bg-red-500' : pwdStrength <= 3 ? 'bg-amber-500' : 'bg-green-500'
                          : 'bg-surface-2'
                      )} />
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {pwdStrength <= 2 ? 'Faible' : pwdStrength <= 3 ? 'Moyen' : 'Fort'}
                    {password.length < PASSWORD_MIN && ` · minimum ${PASSWORD_MIN} caractères`}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation */}
            <div>
              <label className="label" htmlFor="confirm">Confirmer le mot de passe</label>
              <div className="relative">
                <input
                  id="confirm" type={showPwd ? 'text' : 'password'}
                  value={confirm} required
                  onChange={e => setConfirm(e.target.value)}
                  className={cn(
                    'input pr-9',
                    confirm && !pwdMatch && 'border-danger',
                    confirm && pwdMatch  && 'border-green-500'
                  )}
                  placeholder="••••••••"
                />
                {confirm && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {pwdMatch
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <XCircle size={16} className="text-danger" />
                    }
                  </span>
                )}
              </div>
              {confirm && !pwdMatch && (
                <p className="text-xs text-danger mt-1">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || usernameOk === false || emailOk === false || !pwdMatch}
              className="btn-primary w-full mt-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" />Création…</> : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-secondary mt-4">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-[rgb(var(--color-accent))] hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

function StatusIcon({ loading, ok }: { loading: boolean; ok: boolean | null }) {
  if (loading) return <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
  if (ok === true)  return <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
  if (ok === false) return <XCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-danger" />
  return null
}
