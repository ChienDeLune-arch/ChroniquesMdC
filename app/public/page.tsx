import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, getProgressPct, formatPrice } from '@/lib/utils'
import { ArrowRight, FileText, MessageSquare, Target, Files, BarChart3, Sparkles } from 'lucide-react'
import type { Post, Project } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: featuredPosts } = await supabase
    .from('posts')
    .select('id, title, slug, excerpt, cover_image, type, published_at, reading_time, author:profiles!posts_author_id_fkey(username, display_name, avatar_url)')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })
    .limit(3)

  const { data: activeProjects } = await supabase
    .from('projects')
    .select('id, title, slug, short_desc, cover_image, goal_amount, current_amount, currency, ends_at')
    .eq('status', 'active').eq('visibility', 'public')
    .order('created_at', { ascending: false }).limit(3)

  return (
    <main>
      <section className="relative hero-gradient min-h-[85vh] flex flex-col items-center justify-center px-4 py-24 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgb(var(--color-primary)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-primary)) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgb(var(--color-accent) / 0.12) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-8">
            <span className="inline-label"
              style={{ background: 'rgb(var(--color-accent) / 0.12)', color: 'rgb(var(--color-accent))', border: '1px solid rgb(var(--color-accent) / 0.2)' }}>
              <Sparkles size={11} />
              Blog · Discussions · Projets · Fichiers · Sondages
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-[rgb(var(--color-primary))] mb-6 leading-[1.05]"
            style={{ fontFamily: 'var(--font-space)', letterSpacing: '-0.03em' }}>
            Un espace pour<br />
            <span style={{
              background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgb(168 148 255))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              penser & créer
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[rgb(var(--color-secondary))] max-w-2xl mx-auto mb-10 leading-relaxed">
            Un lieu pour partager des réflexions, soutenir des projets,
            accéder à des ressources et échanger en communauté.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/public/blog" className="btn-primary btn-lg">
              Lire le blog <ArrowRight size={18} />
            </Link>
            <Link href="/auth/register"
              className="btn-lg border border-[rgb(var(--color-border))] text-[rgb(var(--color-primary))] hover:border-[rgb(var(--color-border-strong))] hover:bg-[rgb(var(--color-surface-1))] transition-all rounded-[var(--radius)] inline-flex items-center gap-2 px-6 font-medium text-base">
              Rejoindre gratuitement
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-[rgb(var(--color-primary))]" />
        </div>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {QUICK_LINKS.map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}
              className="group flex flex-col items-center gap-3 p-5 surface-card text-center hover:border-[rgb(var(--color-border-strong))] hover:-translate-y-0.5 transition-all duration-200">
              <span className={`p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110 ${color}`}>
                <Icon size={20} />
              </span>
              <span className="text-sm font-medium text-[rgb(var(--color-primary))]">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-12 px-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-medium text-[rgb(var(--color-accent))] uppercase tracking-widest mb-1">Blog</p>
            <h2 className="text-2xl font-bold text-[rgb(var(--color-primary))]">Derniers articles</h2>
          </div>
          <Link href="/public/blog"
            className="flex items-center gap-1 text-sm text-[rgb(var(--color-secondary))] hover:text-[rgb(var(--color-accent))] transition-colors">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
  {(featuredPosts as any[])?.map(post => (
    <div key={post.id} className="surface-card p-4">
      <p>{post.title}</p>
      <p>{post.slug}</p>
    </div>
  ))}
  {!featuredPosts?.length && <p>Aucun article</p>}
</div>
      </section>

      {!!activeProjects?.length && (
        <section className="py-12 px-4 max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-medium text-[rgb(var(--color-accent))] uppercase tracking-widest mb-1">Crowdfunding</p>
              <h2 className="text-2xl font-bold text-[rgb(var(--color-primary))]">Projets à soutenir</h2>
            </div>
            <Link href="/public/projects"
              className="flex items-center gap-1 text-sm text-[rgb(var(--color-secondary))] hover:text-[rgb(var(--color-accent))] transition-colors">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {(activeProjects as Project[]).map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      <section className="py-16 px-4 max-w-4xl mx-auto">
        <div className="surface-card p-10 text-center relative overflow-hidden glow-accent">
          <div className="absolute inset-0 hero-gradient opacity-50" />
          <div className="relative z-10">
            <span className="inline-label mb-4"
              style={{ background: 'rgb(var(--color-accent) / 0.12)', color: 'rgb(var(--color-accent))', border: '1px solid rgb(var(--color-accent) / 0.2)' }}>
              Espace membres
            </span>
            <h2 className="text-3xl font-bold text-[rgb(var(--color-primary))] mb-3 mt-4">
              Rejoins la communauté
            </h2>
            <p className="text-[rgb(var(--color-secondary))] mb-8 max-w-md mx-auto">
              Accès à tout le contenu exclusif, discussions privées, chat et bien plus.
              Gratuit pour les premiers membres.
            </p>
            <Link href="/public/pricing" className="btn-primary btn-lg">
              Voir les offres <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function PostCard({ post }: { post: Post }) {
  const author = post.author
  return (
    <Link href={`/public/blog/${post.slug}`}
      className="group surface-card overflow-hidden flex flex-col hover:border-[rgb(var(--color-border-strong))] hover:-translate-y-0.5 transition-all duration-200">
      <div className="h-44 bg-[rgb(var(--color-surface-2))] overflow-hidden flex-shrink-0">
        {post.cover_image
          ? <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">✍️</div>
        }
      </div>
      <div className="p-5 flex flex-col flex-1">
        <span className="badge-accent mb-2.5 self-start">
          {post.type === 'discussion' ? 'Discussion' : 'Article'}
        </span>
        <h3 className="font-semibold text-[rgb(var(--color-primary))] mb-2 line-clamp-2 group-hover:text-[rgb(var(--color-accent))] transition-colors"
          style={{ fontFamily: 'var(--font-space)' }}>
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-sm text-[rgb(var(--color-secondary))] line-clamp-2 mb-4">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center justify-between text-xs text-[rgb(var(--color-muted))]">
          <span>{(author as any)?.display_name ?? (author as any)?.username ?? 'Anonyme'}</span>
          <div className="flex items-center gap-2">
            {post.reading_time && <span>{post.reading_time} min</span>}
            {post.published_at && <span>{formatDate(post.published_at, 'd MMM yyyy')}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const pct = getProgressPct(project.current_amount, project.goal_amount)
  return (
    <Link href={`/public/projects/${project.slug}`}
      className="group surface-card overflow-hidden flex flex-col hover:border-[rgb(var(--color-border-strong))] hover:-translate-y-0.5 transition-all duration-200">
      <div className="h-36 bg-[rgb(var(--color-surface-2))] overflow-hidden flex-shrink-0">
        {project.cover_image
          ? <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🎯</div>
        }
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-semibold text-[rgb(var(--color-primary))] mb-1 group-hover:text-[rgb(var(--color-accent))] transition-colors line-clamp-2"
          style={{ fontFamily: 'var(--font-space)' }}>
          {project.title}
        </h3>
        {project.short_desc && (
          <p className="text-sm text-[rgb(var(--color-secondary))] line-clamp-2 mb-4">{project.short_desc}</p>
        )}
        <div className="mt-auto">
          <div className="progress-bar mb-2">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-[rgb(var(--color-primary))]">{pct}%</span>
            <span className="text-[rgb(var(--color-muted))]">
              {formatPrice(project.current_amount, project.currency)} / {formatPrice(project.goal_amount, project.currency)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

const QUICK_LINKS = [
  { href: '/public/blog',        label: 'Blog',        icon: FileText,      color: 'bg-blue-500/10 text-blue-400' },
  { href: '/public/discussions', label: 'Discussions', icon: MessageSquare, color: 'bg-violet-500/10 text-violet-400' },
  { href: '/public/projects',    label: 'Projets',     icon: Target,        color: 'bg-emerald-500/10 text-emerald-400' },
  { href: '/public/files',       label: 'Fichiers',    icon: Files,         color: 'bg-amber-500/10 text-amber-400' },
  { href: '/public/polls',       label: 'Sondages',    icon: BarChart3,     color: 'bg-pink-500/10 text-pink-400' },
]
