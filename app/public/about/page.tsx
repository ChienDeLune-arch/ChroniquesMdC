import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'À propos',
  description: 'Qui suis-je et de quoi parle ce site.',
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">

      {/* Intro */}
      <div className="mb-12">
        <h1 className="text-4xl font-semibold text-primary tracking-tight mb-4">
          À propos
        </h1>
        <p className="text-xl text-secondary leading-relaxed">
          Bienvenue sur mon espace personnel — un lieu pour partager des idées,
          explorer des sujets qui m'intéressent et collaborer avec d'autres.
        </p>
      </div>

      {/* Qui suis-je */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-primary mb-4">Qui suis-je ?</h2>
        <div className="prose text-secondary">
          <p>
            Je suis MdC. Ce site est mon espace d'expression libre —
            ni réseau social, ni portfolio formaté. Juste un endroit pour penser à voix haute,
            partager des ressources et échanger avec des gens curieux.
          </p>
          <p className="mt-3">
            J'écris sur la culture en général, mes centres d'interets, de sujets d'actualité et des analyse,
			je publie des fichiers utiles et j'aime lancer des discussions
            à plusieurs auteurs autour de sujets qui méritent plusieurs points de vue.
          </p>
        </div>
      </section>

      {/* Ce qu'on trouve ici */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-primary mb-4">Ce qu'on trouve ici</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { emoji: '✍️', label: 'Blog',        desc: 'Articles et réflexions',          href: '/public/blog' },
            { emoji: '💬', label: 'Discussions',  desc: 'Explorations à plusieurs voix',   href: '/public/discussions' },
            { emoji: '🎯', label: 'Projets',      desc: 'Crowdfunding de projets',         href: '/public/projects' },
            { emoji: '📁', label: 'Fichiers',     desc: 'Ressources libres ou payantes',   href: '/public/files' },
            { emoji: '📊', label: 'Sondages',     desc: 'Questions ouvertes à la communauté', href: '/public/polls' },
            { emoji: '🔒', label: 'Espace privé', desc: 'Contenu exclusif pour membres',  href: '/public/pricing' },
          ].map(({ emoji, label, desc, href }) => (
            <Link key={href} href={href}
              className="surface-card p-4 flex items-start gap-3 hover:border-[rgb(var(--color-border-strong))] transition-colors group">
              <span className="text-2xl flex-shrink-0">{emoji}</span>
              <div>
                <p className="font-medium text-primary group-hover:text-[rgb(var(--color-accent))] transition-colors">{label}</p>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Partie privée */}
      <section className="mb-10 surface-card p-6">
        <h2 className="text-lg font-semibold text-primary mb-2">L'espace membres</h2>
        <p className="text-secondary text-sm mb-4">
          Une partie du contenu est réservée aux membres — discussions plus intimes,
          fichiers exclusifs, chat, et accès prioritaire aux projets.
          Les premiers à rejoindre bénéficient d'un accès gratuit.
        </p>
        <Link href="/public/pricing" className="btn-primary btn-sm">
          En savoir plus <ArrowRight size={14} />
        </Link>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Contact</h2>
        <p className="text-secondary mb-4">
          Une question, une idée de collaboration, ou juste envie d'échanger ?
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="mailto:toi@exemple.fr"
            className="btn-secondary btn-sm">
            <Mail size={15} />
            toi@exemple.fr
          </a>
          {/* Ajoute tes réseaux ici */}
        </div>
      </section>
    </div>
  )
}
