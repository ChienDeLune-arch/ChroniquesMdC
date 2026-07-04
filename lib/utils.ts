import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import slugifyLib from 'slugify'

// ---- CSS helpers ----
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---- Slugify ----
export function slugify(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    locale: 'fr',
    trim: true,
  })
}

// ---- Dates ----
export function timeAgo(date: string): string {
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: fr })
}

export function formatDate(date: string, fmt = 'd MMMM yyyy'): string {
  return format(parseISO(date), fmt, { locale: fr })
}

export function formatDateTime(date: string): string {
  return format(parseISO(date), 'd MMM yyyy à HH:mm', { locale: fr })
}

// ---- Taille fichier ----
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ---- Lecture estimée ----
export function estimateReadingTime(content: string | Record<string, unknown>): number {
  let text = ''
  if (typeof content === 'string') {
    text = content
  } else {
    // Extraire le texte du JSON TipTap
    text = extractTextFromTipTap(content)
  }
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function extractTextFromTipTap(node: Record<string, unknown>): string {
  if (!node) return ''
  if (node.type === 'text') return (node.text as string) || ''
  if (node.content && Array.isArray(node.content)) {
    return (node.content as Record<string, unknown>[])
      .map(extractTextFromTipTap)
      .join(' ')
  }
  return ''
}

// ---- Truncate ----
export function truncate(str: string, length = 160): string {
  if (str.length <= length) return str
  return str.slice(0, length).trimEnd() + '…'
}

// ---- Initiales pour avatar fallback ----
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ---- URL Supabase Storage ----
export function getStorageUrl(
  bucket: string,
  path: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

// ---- Pourcentage crowdfunding ----
export function getProgressPct(current: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((current / goal) * 100))
}

// ---- Validation email ----
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ---- Copier dans le presse-papier ----
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ---- Debounce ----
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ---- Palette couleur pour les tags ----
export const TAG_COLORS = [
  '#6B5FE4', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6',
]

export function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

// ---- Emoji réactions ----
export const REACTION_EMOJIS: Record<string, string> = {
  like:        '👍',
  heart:       '❤️',
  celebrate:   '🎉',
  insightful:  '💡',
}

// ---- Types MIME → icônes ----
export function getMimeIcon(mime: string | null): string {
  if (!mime) return 'file'
  if (mime.startsWith('image/'))       return 'image'
  if (mime.startsWith('video/'))       return 'video'
  if (mime.startsWith('audio/'))       return 'music'
  if (mime === 'application/pdf')      return 'file-text'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'table'
  if (mime.includes('document') || mime.includes('word'))     return 'file-text'
  if (mime.includes('zip') || mime.includes('archive'))       return 'archive'
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html')) return 'code'
  return 'file'
}

// ---- Prix ----
export function formatPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}