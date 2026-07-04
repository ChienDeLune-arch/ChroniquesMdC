'use client'

import { useState } from 'react'
import { X, Bug } from 'lucide-react'

export function BetaBanner() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="relative bg-[rgb(var(--color-accent)/0.1)] border-b border-[rgb(var(--color-accent)/0.2)] px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--color-accent))] animate-pulse" />
          <span className="font-medium text-[rgb(var(--color-accent))]">Beta</span>
        </span>

        <p className="text-[rgb(var(--color-secondary))] text-center">
          Le site vient d'être mis en ligne — il peut contenir des bugs.
          <a
            href="mailto:jhevodigital@gmail.com"
            className="ml-1.5 text-[rgb(var(--color-accent))] hover:underline font-medium"
          >
            Signale-en un
          </a>
          {' '}et merci pour ta patience 🙏
        </p>

        <button
          onClick={() => setVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-primary))] transition-colors"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
