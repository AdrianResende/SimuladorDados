export type Platform = 'instagram' | 'x'
export type ContentType = 'post' | 'reel' | 'ad'

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

export interface ScoredItem {
  item: FeedItem
  score: number
  reasons: string[]
}
