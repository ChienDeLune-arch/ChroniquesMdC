import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import Link from 'next/link'
import { LayoutDashboard, PenSquare, MessageSquare, Files, HelpCircle, Bell } from 'lucide-react'

const SIDEBAR_LINKS = [
  { href: '/private/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/private/editor',     icon: PenSquare,       label: 'Écrire' },
  { href: '/private/chat',       icon: MessageSquare,   label: 'Messages' },
  { href: '/private/requests',   icon: HelpCircle,      label: 'Requêtes' },
  { href: '/private/notifications', icon: Bell,         label: 'Notifications' },
]

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser()
  if (!current) redirect('/auth/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-8 gap-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-48 flex-shrink-0">
          <nav className="sticky top-20 flex flex-col gap-1">
            {SIDEBAR_LINKS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-surface-1 rounded-lg transition-colors"
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        {/* Contenu */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
