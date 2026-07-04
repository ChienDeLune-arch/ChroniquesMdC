'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { Users } from 'lucide-react'
import { ContributeModal } from './ContributeModal'
import type { ProjectTier } from '@/lib/types'

interface TierCardProps {
  tier:          ProjectTier & { backers_count: number }
  currency:      string
  projectId:     string
  projectStatus: string
  isLoggedIn:    boolean
}

export function TierCard({ tier, currency, projectId, projectStatus, isLoggedIn }: TierCardProps) {
  const [open, setOpen] = useState(false)
  const isFull = tier.max_backers !== null && tier.backers_count >= tier.max_backers
  const isActive = projectStatus === 'active'

  return (
    <>
      <div
        className={`surface-card p-4 transition-all ${
          isActive && !isFull
            ? 'hover:border-[rgb(var(--color-accent)/0.5)] hover:shadow-sm cursor-pointer'
            : 'opacity-75'
        }`}
        onClick={() => isActive && !isFull && setOpen(true)}
      >
        {/* Montant */}
        <div className="flex items-start justify-between mb-2">
          <span className="text-lg font-semibold text-[rgb(var(--color-accent))]">
            {formatPrice(tier.amount, currency)}
          </span>
          {isFull && (
            <span className="badge-neutral text-xs">Complet</span>
          )}
        </div>

        {/* Titre */}
        <h3 className="font-medium text-primary mb-1">{tier.title}</h3>

        {/* Description */}
        {tier.description && (
          <p className="text-sm text-secondary mb-3 line-clamp-3">{tier.description}</p>
        )}

        {/* Backers */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted">
            <Users size={11} />
            {tier.backers_count} soutien{tier.backers_count > 1 ? 's' : ''}
            {tier.max_backers ? ` / ${tier.max_backers}` : ''}
          </span>

          {isActive && !isFull && (
            <button
              onClick={e => { e.stopPropagation(); setOpen(true) }}
              className="text-xs text-[rgb(var(--color-accent))] hover:underline font-medium"
            >
              Choisir →
            </button>
          )}
        </div>

        {/* Barre de places restantes */}
        {tier.max_backers && (
          <div className="progress-bar mt-2" style={{ height: '3px' }}>
            <div
              className="h-full bg-[rgb(var(--color-accent))] rounded-full"
              style={{ width: `${(tier.backers_count / tier.max_backers) * 100}%` }}
            />
          </div>
        )}
      </div>

      {open && (
        <ContributeModal
          projectId={projectId}
          projectTitle={tier.title}
          currency={currency}
          fixedAmount={tier.amount}
          tierId={tier.id}
          isLoggedIn={isLoggedIn}
          trigger={false}
          defaultOpen
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
