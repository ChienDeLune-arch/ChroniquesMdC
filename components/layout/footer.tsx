import Link from 'next/link'

const LINKS = [
  { label: 'Blog',        href: '/public/blog' },
  { label: 'Discussions', href: '/public/discussions' },
  { label: 'Projets',     href: '/public/projects' },
  { label: 'Fichiers',    href: '/public/files' },
  { label: 'Sondages',    href: '/public/polls' },
]

export function Footer() {
  return (
    <footer className="border-t border-border mt-20 py-10 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-semibold text-primary">
          Chroniques<span className="text-[rgb(var(--color-accent))]">MdC</span>
        </span>

        <nav className="flex flex-wrap gap-x-5 gap-y-1 justify-center">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-sm text-secondary hover:text-primary transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted">
          © {new Date().getFullYear()} — Tous droits réservés
        </p>
      </div>
    </footer>
  )
}
