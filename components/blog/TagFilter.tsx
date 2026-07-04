'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Tag } from '@/lib/types'

interface TagFilterProps {
  tags: Tag[]
  activeSlug?: string
}

export function TagFilter({ tags, activeSlug }: TagFilterProps) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  function setTag(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) {
      params.set('tag', slug)
    } else {
      params.delete('tag')
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  if (!tags.length) return null

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <button
        onClick={() => setTag(null)}
        className={cn(
          'px-3 py-1.5 text-sm rounded-full border transition-colors',
          !activeSlug
            ? 'bg-[rgb(var(--color-accent))] text-white border-transparent'
            : 'border-border text-secondary hover:text-primary hover:border-[rgb(var(--color-border-strong))]'
        )}
      >
        Tous
      </button>

      {tags.map(tag => (
        <button
          key={tag.id}
          onClick={() => setTag(tag.slug)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-full border transition-colors',
            activeSlug === tag.slug
              ? 'text-white border-transparent'
              : 'border-border text-secondary hover:text-primary hover:border-[rgb(var(--color-border-strong))]'
          )}
          style={
            activeSlug === tag.slug
              ? { backgroundColor: tag.color, borderColor: tag.color }
              : {}
          }
        >
          #{tag.name}
        </button>
      ))}
    </div>
  )
}
