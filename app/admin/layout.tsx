import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, Users, FileText, Files, BarChart3, Settings, ChevronRight, Tag } from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin',          icon: LayoutDashboard,  label: 'Dashboard'    },
  { href: '/admin/users',    icon: Users,            label: 'Utilisateurs' },
  { href: '/admin/tags',     icon: Tag,              label: 'tags'         },
  { href: '/admin/content',  icon: FileText,         label: 'Contenu'      },
  { href: '/admin/files',    icon: Files,            label: 'Fichiers'     },
  { href: '/admin/analytics',icon: BarChart3,        label: 'Analytics'    },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try { await requireAdmin() }
  catch { redirect('/') }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-1 border-r border-border flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-border">
          <Link href="/" className="font-semibold text-primary text-sm">
            ← Mon<span className="text-[rgb(var(--color-accent))]">Site</span>
          </Link>
          <p className="text-xs text-muted mt-0.5 font-medium uppercase tracking-wide">Administration</p>
        </div>
        <nav className="p-3 flex-1">
          {ADMIN_NAV.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-surface-0 rounded-lg transition-colors mb-0.5">
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto bg-surface-0">
        {children}
      </main>
    </div>
  )
}
