'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { User, Lock, Trash2, Upload, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,      setProfile]      = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd,    setSavingPwd]    = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Champs profil
  const [username,     setUsername]     = useState('')
  const [displayName,  setDisplayName]  = useState('')
  const [bio,          setBio]          = useState('')
  const [website,      setWebsite]      = useState('')
  const [avatarUrl,    setAvatarUrl]    = useState('')

  // Champs mot de passe
  const [currentPwd,   setCurrentPwd]   = useState('')
  const [newPwd,       setNewPwd]       = useState('')
  const [confirmPwd,   setConfirmPwd]   = useState('')
  const [showPwd,      setShowPwd]      = useState(false)

  // Supprimer le compte
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        setProfile(data)
        setUsername(data.username ?? '')
        setDisplayName(data.display_name ?? '')
        setBio(data.bio ?? '')
        setWebsite(data.website ?? '')
        setAvatarUrl(data.avatar_url ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  // Upload avatar
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]; if (!file) return
    setUploadingAvatar(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = `avatars/${user!.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { toast.error('Erreur upload'); setUploadingAvatar(false); return }
    const { data: url } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(url.publicUrl)
    setUploadingAvatar(false)
    toast.success('Avatar mis à jour !')
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1, maxSize: 2 * 1024 * 1024,
  })

  async function saveProfile() {
    setSavingProfile(true)
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name: displayName || null, bio: bio || null, website: website || null, avatar_url: avatarUrl || null }),
    })
    const data = await res.json()
    setSavingProfile(false)
    if (!res.ok) { toast.error(data.error); return }
    setProfile(data.data)
    toast.success('Profil mis à jour !')
    router.refresh()
  }

  async function changePassword() {
    if (newPwd.length < 8) { toast.error('Minimum 8 caractères'); return }
    if (newPwd !== confirmPwd) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setSavingPwd(false)
    if (error) { toast.error(error.message); return }
    toast.success('Mot de passe modifié !')
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
  }

  async function deleteAccount() {
    if (deleteConfirm !== profile?.username) {
      toast.error('Saisis ton pseudo pour confirmer')
      return
    }
    const res = await fetch('/api/auth/profile', { method: 'DELETE' })
    if (!res.ok) { toast.error('Erreur suppression'); return }
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-primary">Paramètres du compte</h1>

      {/* ---- Profil ---- */}
      <section className="surface-card p-6 space-y-5">
        <h2 className="font-semibold text-primary flex items-center gap-2">
          <User size={18} />Profil public
        </h2>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              : <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center text-xl font-semibold text-[rgb(var(--color-accent))]">
                  {(displayName || username)?.[0]?.toUpperCase()}
                </div>
            }
          </div>
          <div {...getRootProps()} className="flex-1 border-2 border-dashed border-border rounded-xl p-3 text-center cursor-pointer hover:border-[rgb(var(--color-accent))] transition-colors">
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-2 text-sm text-muted">
              {uploadingAvatar
                ? <><Loader2 size={14} className="animate-spin" />Upload…</>
                : <><Upload size={14} />Changer l'avatar (max 2 Mo)</>
              }
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Pseudo *</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="input" maxLength={20} />
          </div>
          <div>
            <label className="label">Nom affiché</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="input" maxLength={100} />
          </div>
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            rows={3} maxLength={500} className="input resize-none" placeholder="Quelques mots sur toi…" />
          <p className="text-xs text-muted text-right mt-1">{bio.length}/500</p>
        </div>

        <div>
          <label className="label">Site web</label>
          <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
            className="input" placeholder="https://…" />
        </div>

        <button onClick={saveProfile} disabled={savingProfile} className="btn-primary gap-2">
          {savingProfile ? <><RefreshCw size={15} className="animate-spin" />Sauvegarde…</> : 'Sauvegarder'}
        </button>
      </section>

      {/* ---- Mot de passe ---- */}
      <section className="surface-card p-6 space-y-4">
        <h2 className="font-semibold text-primary flex items-center gap-2">
          <Lock size={18} />Changer le mot de passe
        </h2>

        <div>
          <label className="label">Nouveau mot de passe</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              className="input pr-10" placeholder="••••••••" minLength={8} />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Confirmer le nouveau mot de passe</label>
          <input type={showPwd ? 'text' : 'password'} value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            className="input" placeholder="••••••••" />
        </div>

        <button onClick={changePassword} disabled={savingPwd || !newPwd} className="btn-primary gap-2">
          {savingPwd ? <><RefreshCw size={15} className="animate-spin" />Modification…</> : 'Changer le mot de passe'}
        </button>
      </section>

      {/* ---- Supprimer le compte ---- */}
      <section className="surface-card p-6 space-y-4 border-red-200 dark:border-red-900">
        <h2 className="font-semibold text-danger flex items-center gap-2">
          <Trash2 size={18} />Supprimer mon compte
        </h2>
        <p className="text-sm text-secondary">
          Action irréversible. Tout ton contenu sera supprimé.
          Saisis ton pseudo <strong className="text-primary">@{profile?.username}</strong> pour confirmer.
        </p>
        <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
          className="input border-red-300 focus:border-red-500 focus:ring-red-500/30"
          placeholder={profile?.username} />
        <button
          onClick={deleteAccount}
          disabled={deleteConfirm !== profile?.username}
          className="btn-danger gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={15} />Supprimer définitivement
        </button>
      </section>
    </div>
  )
}
