export type Platform = 'instagram' | 'x'
export type ContentType = 'post' | 'reel' | 'video' | 'ad'
export type Step = 1 | 2 | 3

export interface Interest {
  id: string
  label: string
  emoji: string
  tags: string[]
  color: string
}

export interface FeedItem {
  id: string
  platform: Platform
  type: ContentType
  author: string
  avatarUrl?: string
  imageUrl?: string
  text: string
  tags: string[]
  minutesAgo: number
  engagement: number
  sponsor?: string
}

export interface UserProfile {
  selectedInterests: string[]
  tagWeights: Record<string, number>
  likedIds: string[]
  commentedIds: string[]
  watchedIds: string[]
}

export interface ScoredItem {
  item: FeedItem
  score: number
  reasons: string[]
}

// Mantidos para compatibilidade com engine/recommendation.ts
export interface PeerProfile {
  id: string
  name: string
  tagAffinity: Record<string, number>
}

export interface UserSignals {
  tagWeights: Record<string, number>
  likedIds: string[]
  commentsCount: number
  recentSearches: string[]
}
