'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Bell, Menu, X, Pencil, LogOut, Settings, User, ChevronDown } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const NAV_LINKS = [
  { href: '/public/blog',         label: 'Blog' },
  { href: '/public/discussions',  label: 'Discussions' },
  { href: '/public/projects',     label: 'Projets' },
  { href: '/public/files',        label: 'Fichiers' },
  { href: '/public/polls',        label: 'Sondages' },
  { href: '/public/about',        label: 'À propos' },
]

export function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted,    setMounted]    = useState(false)
  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [userOpen,   setUserOpen]   = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [scrolled,   setScrolled]   = useState(false)
	
  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      const { count } = await supabase.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('is_read', false)
      setNotifCount(count ?? 0)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) { setProfile(null); setNotifCount(0) }
    })

    // Scroll shadow
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { subscription.unsubscribe(); window.removeEventListener('scroll', onScroll) }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className={cn(
      'sticky top-0 z-50 transition-all duration-200',
      scrolled
        ? 'bg-[rgb(var(--color-surface-0)/0.85)] backdrop-blur-md border-b border-[rgb(var(--color-border))]'
        : 'bg-transparent'
    )}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
          <span className="font-bold text-lg tracking-tight text-[rgb(var(--color-primary))]"
            style={{ fontFamily: 'var(--font-space)' }}>
            Chroniques<span style={{ color: 'rgb(var(--color-accent))' }}>MdC</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <ul className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <li key={href}>
                <Link href={href} className={cn(
                  'px-3 py-2 text-sm rounded-lg transition-all duration-150',
                  active
                    ? 'text-[rgb(var(--color-primary))] font-medium bg-[rgb(var(--color-surface-2))]'
                    : 'text-[rgb(var(--color-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-1))]'
                )}>
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Droite */}
        <div className="flex items-center gap-1">

          {/* Toggle thème */}
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className={cn(
                'p-2 rounded-lg transition-all duration-150',
                'text-[rgb(var(--color-secondary))] hover:text-[rgb(var(--color-primary))]',
                'hover:bg-[rgb(var(--color-surface-2))]'
              )}
              aria-label="Changer de thème"
            >
              {resolvedTheme === 'dark'
                ? <Sun size={17} />
                : <Moon size={17} />
              }
            </button>
          )}

          {profile ? (
            <>
              {/* Notifs */}
              <Link href="/private/notifications"
                className="relative p-2 rounded-lg text-[rgb(var(--color-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-2))] transition-all">
                <Bell size={17} />
                {notifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[rgb(var(--color-accent))] rounded-full" />
                )}
              </Link>

              {/* Écrire */}
              <Link href="/private/editor" className="hidden sm:flex btn-primary btn-sm ml-1">
                <Pencil size={13} />Écrire
              </Link>

              {/* User dropdown */}
              <div className="relative ml-1">
                <button
                  onClick={() => setUserOpen(o => !o)}
                  className={cn(
                    'flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl transition-all',
                    userOpen
                      ? 'bg-[rgb(var(--color-surface-2))]'
                      : 'hover:bg-[rgb(var(--color-surface-2))]'
                  )}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-[rgb(var(--color-border))]" />
                    : <span className="avatar-sm">{getInitials(profile.display_name ?? profile.username)}</span>
                  }
                  <ChevronDown size={13} className={cn('text-[rgb(var(--color-muted))] transition-transform hidden sm:block', userOpen && 'rotate-180')} />
                </button>

                {userOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 z-50 surface-card py-1.5 overflow-hidden animate-fade-in">
                      <div className="px-4 py-2.5 border-b border-[rgb(var(--color-border))]">
                        <p className="font-semibold text-sm text-[rgb(var(--color-primary))] truncate">
                          {profile.display_name ?? profile.username}
                        </p>
                        <p className="text-xs text-[rgb(var(--color-muted))]">@{profile.username}</p>
                      </div>
                      <div className="py-1">
                        <DropItem href={`/profile/${profile.username}`} icon={<User size={14} />}>Profil</DropItem>
                        <DropItem href="/private/dashboard"             icon={<Settings size={14} />}>Dashboard</DropItem>
                        <DropItem href="/private/settings"              icon={<Settings size={14} />}>Paramètres</DropItem>
                        {profile.role === 'admin' && (
                          <DropItem href="/admin" icon={<Settings size={14} />}>Administration</DropItem>
                        )}
                      </div>
                      <div className="border-t border-[rgb(var(--color-border))] py-1">
                        <button onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                          <LogOut size={14} />Se déconnecter
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Link href="/auth/login"    className="hidden sm:flex btn-ghost btn-sm">Connexion</Link>
              <Link href="/auth/register" className="btn-primary btn-sm">S'inscrire</Link>
            </div>
          )}

          {/* Menu mobile */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-2 rounded-lg text-[rgb(var(--color-secondary))] hover:bg-[rgb(var(--color-surface-2))] md:hidden ml-1"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-0)/0.95)] backdrop-blur-md px-4 py-3 flex flex-col gap-1 animate-fade-in">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className={cn(
                'px-3 py-2.5 text-sm rounded-lg transition-colors',
                pathname.startsWith(href)
                  ? 'bg-[rgb(var(--color-surface-2))] font-medium text-[rgb(var(--color-primary))]'
                  : 'text-[rgb(var(--color-secondary))] hover:bg-[rgb(var(--color-surface-1))]'
              )}>
              {label}
            </Link>
          ))}
          {(profile?.role === 'admin') && (
			  <Link href="/private/editor" className="hidden sm:flex btn-primary btn-sm ml-1">
				<Pencil size={13} />Écrire
			  </Link>
			)}
        </div>
      )}
    </header>
  )
}

function DropItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[rgb(var(--color-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-2))] transition-colors">
      {icon}{children}
    </Link>
  )
}
