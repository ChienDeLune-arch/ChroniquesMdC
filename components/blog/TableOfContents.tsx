'use client'

import { useEffect, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface Heading {
  id:    string
  text:  string
  level: number
}

function extractHeadings(node: Record<string, unknown>): Heading[] {
  const headings: Heading[] = []
  function walk(n: Record<string, unknown>) {
    if (!n) return
    if (n.type === 'heading' && typeof n.attrs === 'object' && n.attrs) {
      const attrs = n.attrs as Record<string, unknown>
      const level = attrs.level as number
      const content = (n.content as Record<string, unknown>[] | undefined) ?? []
      const text = content
        .filter(c => c.type === 'text')
        .map(c => c.text as string)
        .join('')
      if (text) {
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)
        headings.push({ id, text, level })
      }
    }
    if (Array.isArray(n.content)) {
      ;(n.content as Record<string, unknown>[]).forEach(walk)
    }
  }
  walk(node)
  return headings
}

interface TableOfContentsProps {
  content: Record<string, unknown>
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings    = useMemo(() => extractHeadings(content), [content])
  const [active, setActive] = useState<string>('')

  // Scrollspy
  useEffect(() => {
    if (!headings.length) return

    // Injecter les IDs sur les headings du DOM
    const domHeadings = document.querySelectorAll('.prose h1, .prose h2, .prose h3')
    domHeadings.forEach((el, i) => {
      if (headings[i]) el.id = headings[i].id
    })

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting)
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-10% 0px -80% 0px' }
    )

    domHeadings.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  if (!headings.length) return null

  return (
    <nav aria-label="Table des matières">
      <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">
        Sommaire
      </p>
      <ul className="space-y-1">
        {headings.map(h => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                'block text-xs leading-tight py-0.5 transition-colors truncate',
                h.level === 1 ? 'pl-0' : h.level === 2 ? 'pl-3' : 'pl-6',
                active === h.id
                  ? 'text-[rgb(var(--color-accent))] font-medium'
                  : 'text-secondary hover:text-primary'
              )}
              onClick={e => {
                e.preventDefault()
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
