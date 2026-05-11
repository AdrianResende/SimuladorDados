import type { FeedItem, PeerProfile, ScoredItem, UserSignals } from '../types'

const normalizeRecency = (minutesAgo: number): number => {
  return Math.max(0.2, 1 - minutesAgo / 120)
}

const tagOverlapScore = (
  tags: string[],
  tagWeights: Record<string, number>,
): number => {
  return tags.reduce((acc, tag) => acc + (tagWeights[tag] ?? 0), 0)
}

const searchBoost = (item: FeedItem, searches: string[]): number => {
  if (searches.length === 0) {
    return 0
  }

  const terms = searches.flatMap((search) =>
    search
      .toLowerCase()
      .split(' ')
      .map((term) => term.trim())
      .filter(Boolean),
  )

  const content = `${item.text} ${item.tags.join(' ')}`.toLowerCase()
  const matches = terms.filter((term) => content.includes(term)).length
  return matches * 1.2
}

export const scoreByContent = (
  item: FeedItem,
  signals: UserSignals,
): ScoredItem => {
  const overlap = tagOverlapScore(item.tags, signals.tagWeights)
  const recency = normalizeRecency(item.minutesAgo)
  const engagement = item.engagement / 100
  const adPenalty = item.type === 'ad' ? -0.8 : 0
  const queryBonus = searchBoost(item, signals.recentSearches)

  const score = overlap * 2.8 + recency * 2 + engagement * 1.3 + adPenalty + queryBonus

  return {
    item,
    score,
    reasons: [
      `Interesse: ${overlap.toFixed(2)}`,
      `Recencia: ${recency.toFixed(2)}`,
      `Engajamento: ${engagement.toFixed(2)}`,
      `Busca: ${queryBonus.toFixed(2)}`,
    ],
  }
}

export const scoreByCollaborative = (
  item: FeedItem,
  signals: UserSignals,
  peers: PeerProfile[],
): ScoredItem => {
  const peerSignal = peers.reduce((acc, peer) => {
    const affinity = tagOverlapScore(item.tags, peer.tagAffinity)
    return acc + affinity
  }, 0)

  const userBridge = tagOverlapScore(item.tags, signals.tagWeights)
  const recency = normalizeRecency(item.minutesAgo)
  const socialProof = Math.min(1.5, item.engagement / 70)
  const queryBonus = searchBoost(item, signals.recentSearches) * 0.7

  const score = peerSignal * 1.7 + userBridge * 0.9 + recency + socialProof + queryBonus

  return {
    item,
    score,
    reasons: [
      `Vizinhos: ${peerSignal.toFixed(2)}`,
      `Ponte com voce: ${userBridge.toFixed(2)}`,
      `Prova social: ${socialProof.toFixed(2)}`,
      `Busca: ${queryBonus.toFixed(2)}`,
    ],
  }
}

export const rankItems = (
  items: FeedItem[],
  scorer: (item: FeedItem) => ScoredItem,
): ScoredItem[] => {
  return items.map((item) => scorer(item)).sort((a, b) => b.score - a.score)
}

export const registerLike = (signals: UserSignals, item: FeedItem): UserSignals => {
  const updatedWeights = { ...signals.tagWeights }
  item.tags.forEach((tag) => {
    updatedWeights[tag] = (updatedWeights[tag] ?? 0.2) + 0.35
  })

  return {
    ...signals,
    tagWeights: updatedWeights,
    likedIds: signals.likedIds.includes(item.id)
      ? signals.likedIds
      : [...signals.likedIds, item.id],
  }
}

export const registerComment = (
  signals: UserSignals,
  item: FeedItem,
  comment: string,
): UserSignals => {
  const updatedWeights = { ...signals.tagWeights }
  item.tags.forEach((tag) => {
    updatedWeights[tag] = (updatedWeights[tag] ?? 0.2) + 0.2
  })

  const lowComment = comment.toLowerCase()
  if (lowComment.includes('quero mais') || lowComment.includes('curti')) {
    item.tags.forEach((tag) => {
      updatedWeights[tag] = (updatedWeights[tag] ?? 0.2) + 0.25
    })
  }

  return {
    ...signals,
    tagWeights: updatedWeights,
    commentsCount: signals.commentsCount + 1,
  }
}

export const registerSearch = (
  signals: UserSignals,
  search: string,
): UserSignals => {
  const clean = search.trim().toLowerCase()
  if (!clean) {
    return signals
  }

  const updatedWeights = { ...signals.tagWeights }
  clean.split(' ').forEach((term) => {
    if (term) {
      updatedWeights[term] = (updatedWeights[term] ?? 0.1) + 0.5
    }
  })

  const recentSearches = [clean, ...signals.recentSearches].slice(0, 4)

  return {
    ...signals,
    tagWeights: updatedWeights,
    recentSearches,
  }
}
