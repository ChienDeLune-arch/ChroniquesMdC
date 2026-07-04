import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, formatPrice, getInitials, timeAgo } from '@/lib/utils'
import {
  PenSquare, Files, Target, BarChart3,
  MessageSquare, Bell, Settings, ArrowRight,
} from 'lucide-react'

export default async function DashboardPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/auth/login?redirect=/private/dashboard')

  const supabase = await createClient()
  const userId   = current.user.id
  const profile  = current.profile!

  // Stats de l'utilisateur
  const [
    { count: postCount },
    { count: fileCount },
    { count: projectCount },
    { data: recentPosts },
    { data: notifications },
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('files').select('*', { count: 'exact', head: true }).eq('uploader_id', userId),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('creator_id', userId),
    supabase.from('posts')
      .select('id, title, slug, type, status, published_at, views')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('notifications')
      .select('id, type, title, body, link, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const unreadCount = (notifications ?? []).filter((n: any) => !n.is_read).length

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
            : <span className="avatar-xl">{getInitials(profile?.display_name ?? profile?.username)}</span>
          }
          <div>
            <h1 className="text-2xl font-semibold text-primary">
              Bonjour, {profile?.display_name ?? profile?.username} 👋
            </h1>
            <p className="text-secondary text-sm mt-0.5">@{profile?.username}</p>
          </div>
        </div>
        <Link href="/private/settings" className="btn-secondary btn-sm">
          <Settings size={15} />Paramètres
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Articles',  value: postCount ?? 0,    icon: PenSquare, href: '/private/editor' },
          { label: 'Fichiers',  value: fileCount ?? 0,    icon: Files,     href: '/private/files/upload' },
          { label: 'Projets',   value: projectCount ?? 0, icon: Target,    href: '/private/projects/new' },
          { label: 'Notifs',    value: unreadCount,        icon: Bell,      href: '/private/notifications', highlight: unreadCount > 0 },
        ].map(({ label, value, icon: Icon, href, highlight }) => (
          <Link key={label} href={href}
            className="surface-card p-4 flex items-center gap-3 hover:border-[rgb(var(--color-border-strong))] transition-all group">
            <span className={`p-2 rounded-lg ${highlight ? 'bg-[rgb(var(--color-accent)/0.15)] text-[rgb(var(--color-accent))]' : 'bg-surface-2 text-secondary'}`}>
              <Icon size={18} />
            </span>
            <div>
              <p className={`text-xl font-semibold ${highlight ? 'text-[rgb(var(--color-accent))]' : 'text-primary'}`}>
                {value}
              </p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Actions rapides */}
      <div>
		  <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">Actions rapides</h2>
		  <div className="grid sm:grid-cols-2 gap-3">

			{/* Admin seulement */}
			{profile.role === 'admin' && (
			  <>
				{[
				  { label: 'Écrire un article',         href: '/private/editor',           icon: PenSquare },
				  { label: 'Mettre un fichier en ligne', href: '/private/files/upload',    icon: Files },
				  { label: 'Lancer un projet',           href: '/private/projects/new',    icon: Target },
				  { label: 'Créer un sondage',           href: '/private/polls/new',       icon: BarChart3 },
				  { label: 'Nouvelle discussion',        href: '/private/discussions/new', icon: MessageSquare },
				].map(({ label, href, icon: Icon }) => (
				  <Link key={href} href={href}
					className="flex items-center gap-3 px-4 py-3 surface-card hover:border-[rgb(var(--color-border-strong))] transition-all group">
					<Icon size={16} className="text-muted group-hover:text-[rgb(var(--color-accent))] transition-colors" />
					<span className="text-sm text-primary group-hover:text-[rgb(var(--color-accent))] transition-colors">{label}</span>
					<ArrowRight size={14} className="ml-auto text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
				  </Link>
				))}
			  </>
			)}

			{/* Tous les membres */}
			<Link href="/private/requests"
			  className="flex items-center gap-3 px-4 py-3 surface-card hover:border-[rgb(var(--color-border-strong))] transition-all group">
			  <ArrowRight size={16} className="text-muted group-hover:text-[rgb(var(--color-accent))] transition-colors" />
			  <span className="text-sm text-primary group-hover:text-[rgb(var(--color-accent))] transition-colors">Envoyer une requête</span>
			  <ArrowRight size={14} className="ml-auto text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
			</Link>

		  </div>
		</div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Derniers articles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider">Mes articles</h2>
            <Link href="/private/editor" className="text-xs text-[rgb(var(--color-accent))] hover:underline">
              Écrire →
            </Link>
          </div>
          <div className="surface-card divide-y divide-border">
            {recentPosts?.length ? (
              (recentPosts as any[]).map(post => (
                <div key={post.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        post.status === 'published'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-surface-2 text-muted'
                      }`}>
                        {post.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                      {post.views > 0 && (
                        <span className="text-xs text-muted">{post.views} vues</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/private/editor/${post.id}`}
                    className="text-xs text-[rgb(var(--color-accent))] hover:underline flex-shrink-0">
                    Modifier
                  </Link>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted">Aucun article pour le moment.</p>
                <Link href="/private/editor" className="btn-primary btn-sm mt-3 inline-flex">
                  Écrire le premier
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 badge bg-[rgb(var(--color-accent))] text-white">{unreadCount}</span>
              )}
            </h2>
            <Link href="/private/notifications" className="text-xs text-[rgb(var(--color-accent))] hover:underline">
              Tout voir →
            </Link>
          </div>
          <div className="surface-card divide-y divide-border">
            {notifications?.length ? (
              (notifications as any[]).map(notif => (
                <div key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 ${!notif.is_read ? 'bg-[rgb(var(--color-accent)/0.04)]' : ''}`}>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[rgb(var(--color-accent))] flex-shrink-0 mt-1.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">{notif.title}</p>
                    {notif.body && <p className="text-xs text-muted truncate">{notif.body}</p>}
                    <p className="text-xs text-muted mt-0.5">{timeAgo(notif.created_at)}</p>
                  </div>
                  {notif.link && (
                    <Link href={notif.link} className="text-xs text-[rgb(var(--color-accent))] hover:underline flex-shrink-0">
                      Voir
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted">Aucune notification.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
