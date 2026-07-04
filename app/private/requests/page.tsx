import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { RequestForm } from '@/components/requests/RequestForm'
import { formatDate, timeAgo } from '@/lib/utils'
import { HelpCircle, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'En attente',  color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',  icon: Clock },
  reviewing: { label: 'En cours',    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',      icon: Loader2 },
  accepted:  { label: 'Acceptée',    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',  icon: CheckCircle2 },
  declined:  { label: 'Refusée',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',          icon: XCircle },
  completed: { label: 'Terminée',    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', icon: CheckCircle2 },
}

const TYPE_LABELS: Record<string, string> = {
  general:       'Général',
  collaboration: 'Collaboration',
  content:       'Contenu',
  technical:     'Technique',
  commercial:    'Commercial',
}

export default async function RequestsPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/auth/login?redirect=/private/requests')

  const supabase = await createClient()

  const { data: requests } = await supabase
    .from('requests')
    .select('id, title, description, type, status, response, responded_at, budget_min, budget_max, created_at')
    .eq('requester_id', current.user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary flex items-center gap-2">
          <HelpCircle size={24} />
          Mes requêtes
        </h1>
        <p className="text-secondary mt-1">
          Envoie une demande — collaboration, contenu sur mesure, question technique ou commerciale.
        </p>
      </div>

      {/* Formulaire */}
      <RequestForm userId={current.user.id} />

      {/* Liste des requêtes existantes */}
      {requests && requests.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
            Historique ({requests.length})
          </h2>
          <div className="space-y-4">
            {(requests as any[]).map(req => {
              const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
              const Icon = cfg.icon
              return (
                <div key={req.id} className="surface-card p-5">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`badge ${cfg.color} flex items-center gap-1`}>
                          <Icon size={11} />
                          {cfg.label}
                        </span>
                        <span className="badge-neutral">{TYPE_LABELS[req.type] ?? req.type}</span>
                      </div>
                      <h3 className="font-medium text-primary">{req.title}</h3>
                    </div>
                    <span className="text-xs text-muted flex-shrink-0">{timeAgo(req.created_at)}</span>
                  </div>

                  <p className="text-sm text-secondary mb-3 line-clamp-2">{req.description}</p>

                  {(req.budget_min || req.budget_max) && (
                    <p className="text-xs text-muted mb-2">
                      Budget : {req.budget_min ? `${req.budget_min / 100}€` : ''}
                      {req.budget_min && req.budget_max ? ' – ' : ''}
                      {req.budget_max ? `${req.budget_max / 100}€` : ''}
                    </p>
                  )}

                  {/* Réponse */}
                  {req.response && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                        Réponse {req.responded_at ? `· ${formatDate(req.responded_at)}` : ''}
                      </p>
                      <p className="text-sm text-primary">{req.response}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
