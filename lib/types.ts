// ============================================================
// TYPES TYPESCRIPT — my-site
// ============================================================

// --- Base ---
export type Role = 'admin' | 'moderator' | 'member'
export type Visibility = 'public' | 'members' | 'private'

// --- Profiles ---
export interface Profile {
  id: string
  username: string
  email?: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  role: Role
  stripe_customer_id: string | null
  is_verified: boolean
  private_access:  boolean
  created_at: string
  updated_at: string
}

// --- Tags ---
export interface Tag {
  id: string
  name: string
  slug: string
  color: string
  created_at: string
}

// --- Posts ---
export type PostType = 'blog' | 'discussion' | 'note'
export type PostStatus = 'draft' | 'published' | 'archived'

export interface Post {
  id: string
  title: string
  slug: string
  content: Record<string, unknown> | null  // TipTap JSON
  excerpt: string | null
  cover_image: string | null
  type: PostType
  status: PostStatus
  visibility: Visibility
  author_id: string | null
  views: number
  reading_time: number | null
  allow_comments: boolean
  is_featured: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  // Relations (jointures)
  author?: Profile
  tags?: Tag[]
  co_authors?: Profile[]
  comments_count?: number
  reactions_count?: number
}

// --- Comments ---
export interface Comment {
  id: string
  post_id: string
  author_id: string | null
  parent_id: string | null
  content: string
  is_approved: boolean
  created_at: string
  updated_at: string
  author?: Profile
  replies?: Comment[]
}

// --- Files ---
export type PricingType = 'free' | 'paid' | 'pwyw'

export interface File {
  id: string
  uploader_id: string | null
  title: string
  description: string | null
  file_path: string
  file_name: string
  file_size: number
  mime_type: string | null
  cover_image: string | null
  visibility: Visibility
  pricing_type: PricingType
  price: number  // centimes
  currency: string
  stripe_product_id: string | null
  stripe_price_id: string | null
  download_count: number
  created_at: string
  updated_at: string
  uploader?: Profile
  tags?: Tag[]
  has_purchased?: boolean  // calculé côté app
}

// --- Polls ---
export type ShowResults = 'always' | 'after_vote' | 'after_close' | 'never'
export type PollStatus = 'active' | 'closed'

export interface PollOption {
  id: string
  poll_id: string
  text: string
  position: number
  votes_count?: number  // calculé
}

export interface Poll {
  id: string
  creator_id: string | null
  title: string
  description: string | null
  visibility: Visibility
  allow_multiple: boolean
  is_anonymous: boolean
  show_results: ShowResults
  ends_at: string | null
  status: PollStatus
  created_at: string
  creator?: Profile
  options?: PollOption[]
  total_votes?: number
  user_voted?: string[]  // IDs des options votées par l'utilisateur
}

// --- Projects (Crowdfunding) ---
export type ProjectStatus = 'draft' | 'active' | 'funded' | 'closed' | 'cancelled'

export interface ProjectTier {
  id: string
  project_id: string
  title: string
  description: string | null
  amount: number
  max_backers: number | null
  stripe_price_id: string | null
  created_at: string
  backers_count?: number
}

export interface ProjectContribution {
  id: string
  project_id: string
  tier_id: string | null
  contributor_id: string | null
  amount: number
  is_anonymous: boolean
  message: string | null
  created_at: string
  contributor?: Profile
  tier?: ProjectTier
}

export interface Project {
  id: string
  creator_id: string | null
  title: string
  slug: string
  short_desc: string | null
  content: Record<string, unknown> | null
  cover_image: string | null
  goal_amount: number
  current_amount: number
  currency: string
  status: ProjectStatus
  visibility: Visibility
  ends_at: string | null
  stripe_product_id: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  tiers?: ProjectTier[]
  contributions?: ProjectContribution[]
  progress_pct?: number  // calculé
}

// --- Products ---
export type ProductType = 'one_time' | 'subscription' | 'bundle'
export type BillingInterval = 'month' | 'year'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing'

export interface Product {
  id: string
  creator_id: string | null
  title: string
  description: string | null
  type: ProductType
  price: number
  currency: string
  billing_interval: BillingInterval | null
  stripe_product_id: string | null
  stripe_price_id: string | null
  max_members: number | null
  is_active: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface UserProduct {
  id: string
  user_id: string
  product_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  status: SubscriptionStatus
  current_period_end: string | null
  created_at: string
  product?: Product
}

// --- Chat ---
export interface Attachment {
  url: string
  name: string
  type: string
  size: number
}

export interface DirectMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  attachments: Attachment[] | null
  is_read: boolean
  created_at: string
  sender?: Profile
}

export interface GroupChat {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  members?: GroupChatMember[]
  last_message?: GroupMessage
  unread_count?: number
}

export interface GroupChatMember {
  chat_id: string
  profile_id: string
  role: 'admin' | 'member'
  joined_at: string
  profile?: Profile
}

export interface GroupMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string | null
  attachments: Attachment[] | null
  created_at: string
  updated_at: string
  sender?: Profile
}

// --- Requests ---
export type RequestType = 'general' | 'collaboration' | 'content' | 'technical' | 'commercial'
export type RequestStatus = 'pending' | 'reviewing' | 'accepted' | 'declined' | 'completed'

export interface Request {
  id: string
  requester_id: string
  title: string
  description: string
  type: RequestType
  status: RequestStatus
  is_public: boolean
  budget_min: number | null
  budget_max: number | null
  response: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
  requester?: Profile
}

// --- Reactions ---
export type ReactionType = 'like' | 'heart' | 'celebrate' | 'insightful'
export type EntityType = 'post' | 'comment' | 'file' | 'project'

export interface Reaction {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  type: ReactionType
  created_at: string
  user?: Profile
}

// --- Notifications ---
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  data: Record<string, unknown> | null
  created_at: string
}

// --- API Responses ---
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

// --- Forms ---
export interface CreatePostForm {
  title: string
  content: Record<string, unknown>
  excerpt?: string
  cover_image?: string
  type: PostType
  visibility: Visibility
  tag_ids?: string[]
  co_author_ids?: string[]
}

export interface CreatePollForm {
  title: string
  description?: string
  options: { text: string }[]
  visibility: Visibility
  allow_multiple: boolean
  is_anonymous: boolean
  show_results: ShowResults
  ends_at?: string
}

export interface CreateProjectForm {
  title: string
  short_desc?: string
  content?: Record<string, unknown>
  cover_image?: string
  goal_amount: number
  currency: string
  ends_at?: string
  tiers?: Omit<ProjectTier, 'id' | 'project_id' | 'stripe_price_id' | 'created_at' | 'backers_count'>[]
}

export interface CreateRequestForm {
  title: string
  description: string
  type: RequestType
  is_public: boolean
  budget_min?: number
  budget_max?: number
}

// --- Auth ---
export interface AuthUser {
  id: string
  email: string
  profile: Profile
}

// --- Admin analytics ---
export interface DashboardStats {
  total_users: number
  total_posts: number
  total_files: number
  total_projects: number
  total_revenue: number  // centimes
  active_subscriptions: number
  this_month: {
    new_users: number
    new_posts: number
    downloads: number
    revenue: number
  }
}
