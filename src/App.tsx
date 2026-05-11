import { useMemo, useState } from 'react'
import './App.css'
import { feedItems } from './data/mockData'
import type { FeedItem, Platform } from './types'

type ScenarioKey = 'neutro' | 'futebol' | 'divapop' | 'comida' | 'compras'

interface ScenarioConfig {
  label: string
  seedTags: string[]
}

const scenarios: Record<ScenarioKey, ScenarioConfig> = {
  neutro: {
    label: 'Publico Misto',
    seedTags: [],
  },
  futebol: {
    label: 'Fan de Futebol',
    seedTags: ['futebol', 'esportes', 'transferencias'],
  },
  divapop: {
    label: 'Fan de Diva Pop',
    seedTags: ['diva-pop', 'musica', 'famosos'],
  },
  comida: {
    label: 'Fan de Comida',
    seedTags: ['comida', 'receita', 'restaurante'],
  },
  compras: {
    label: 'Comprador Tech/Moto',
    seedTags: ['celular', 'moto', 'comparativo', 'promocao'],
  },
}

const hasTag = (item: FeedItem, tags: string[]): boolean => {
  return tags.some((tag) => item.tags.includes(tag))
}

const adTagAliases: Record<string, string[]> = {
  futebol: ['futebol', 'chuteira', 'esportes'],
  celular: ['celular', 'smartphone', 'tecnologia'],
  moto: ['moto', 'motocicleta', 'promocao'],
  comida: ['comida', 'restaurante', 'receita'],
  'diva-pop': ['diva-pop', 'musica', 'famosos'],
}

const dynamicAdCopy: Record<string, { sponsor: string; text: string; tags: string[] }> = {
  futebol: {
    sponsor: 'ChuteiraMax',
    text: 'Anuncio: chuteira com amortecimento para seu proximo jogo.',
    tags: ['futebol', 'chuteira', 'anuncio'],
  },
  celular: {
    sponsor: 'SmartDeal',
    text: 'Anuncio: celular novo com desconto e troca do usado.',
    tags: ['celular', 'smartphone', 'anuncio'],
  },
  moto: {
    sponsor: 'MotoPrime',
    text: 'Anuncio: moto urbana com taxa especial nesta semana.',
    tags: ['moto', 'promocao', 'anuncio'],
  },
  comida: {
    sponsor: 'FoodPass',
    text: 'Anuncio: cupom de comida para os restaurantes mais pedidos.',
    tags: ['comida', 'restaurante', 'anuncio'],
  },
  'diva-pop': {
    sponsor: 'MusicGo',
    text: 'Anuncio: ingressos e produtos oficiais da turne da diva pop.',
    tags: ['diva-pop', 'musica', 'anuncio'],
  },
}

const normalizeLikeTag = (item: FeedItem): string => {
  if (item.tags.includes('futebol') || item.tags.includes('esportes')) {
    return 'futebol'
  }

  if (item.tags.includes('celular') || item.tags.includes('smartphone')) {
    return 'celular'
  }

  if (item.tags.includes('moto') || item.tags.includes('motocicleta')) {
    return 'moto'
  }

  if (item.tags.includes('comida') || item.tags.includes('restaurante')) {
    return 'comida'
  }

  if (item.tags.includes('diva-pop') || item.tags.includes('musica')) {
    return 'diva-pop'
  }

  return item.tags[0] ?? 'futebol'
}

function App() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('neutro')
  const [activeTab, setActiveTab] = useState<Platform>('instagram')
  const [lastLikedTag, setLastLikedTag] = useState<string | null>(null)
  const [crossAdTarget, setCrossAdTarget] = useState<Platform | null>(null)
  const [adShiftStep, setAdShiftStep] = useState(0)
  const [boostPostsByPlatform, setBoostPostsByPlatform] = useState<Record<Platform, FeedItem[]>>({
    instagram: [],
    x: [],
  })
  const [extraPostsByPlatform, setExtraPostsByPlatform] = useState<Record<Platform, FeedItem[]>>({
    instagram: [],
    x: [],
  })
  const [hintText, setHintText] = useState('Dica: curta no Instagram e veja o anuncio subir no X.')

  const instagramItems = useMemo(
    () => feedItems.filter((item) => item.platform === 'instagram'),
    [],
  )
  const xItems = useMemo(() => feedItems.filter((item) => item.platform === 'x'), [])

  const buildDynamicAd = (platform: Platform, preferredTag: string): FeedItem => {
    const ad = dynamicAdCopy[preferredTag] ?? {
      sponsor: 'AdsNow',
      text: `Anuncio: ofertas novas sobre ${preferredTag}.`,
      tags: [preferredTag, 'anuncio'],
    }

    return {
      id: `dyn-ad-${platform}-${preferredTag}`,
      platform,
      type: 'ad',
      author: 'Ad',
      avatarUrl: 'https://i.pravatar.cc/100?img=65',
      imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80',
      sponsor: ad.sponsor,
      text: ad.text,
      tags: ad.tags,
      minutesAgo: 1,
      engagement: 99,
    }
  }

  const selectAd = (
    items: FeedItem[],
    preferredTag: string | null,
    platform: Platform,
  ): FeedItem | null => {
    const ads = items.filter((item) => item.type === 'ad')
    if (ads.length === 0 && !preferredTag) {
      return null
    }

    if (!preferredTag) {
      return ads[0]
    }

    const exact = ads.find((ad) => ad.tags.includes(preferredTag))
    if (exact) {
      return exact
    }

    const aliases = adTagAliases[preferredTag] ?? [preferredTag]
    const aliasMatch = ads.find((ad) => aliases.some((alias) => ad.tags.includes(alias)))
    if (aliasMatch) {
      return aliasMatch
    }

    return buildDynamicAd(platform, preferredTag)
  }

  const buildFeed = (platformItems: FeedItem[], platform: Platform): FeedItem[] => {
    const posts = platformItems.filter((item) => item.type !== 'ad')
    const boostedPosts = boostPostsByPlatform[platform]
    const boostedIds = new Set(boostedPosts.map((post) => post.id))
    const remainingPosts = posts.filter((post) => !boostedIds.has(post.id))
    const orderedPosts = [...boostedPosts, ...remainingPosts, ...extraPostsByPlatform[platform]]
    const selectedAd = selectAd(platformItems, lastLikedTag, platform)

    if (!selectedAd) {
      return orderedPosts
    }

    if (crossAdTarget === platform) {
      if (orderedPosts.length === 0) {
        return [selectedAd]
      }

      // A cada curtida, o anuncio no outro sistema muda de posicao.
      const cycle = [1, 2, 3]
      const desiredPosition = cycle[adShiftStep % cycle.length]
      const insertAt = Math.min(desiredPosition, orderedPosts.length)
      return [
        ...orderedPosts.slice(0, insertAt),
        selectedAd,
        ...orderedPosts.slice(insertAt),
      ]
    }

    return [...orderedPosts, selectedAd]
  }

  const instagramFeed = useMemo(
    () => buildFeed(instagramItems, 'instagram'),
    [instagramItems, lastLikedTag, crossAdTarget, adShiftStep, extraPostsByPlatform],
  )

  const xFeed = useMemo(
    () => buildFeed(xItems, 'x'),
    [xItems, lastLikedTag, crossAdTarget, adShiftStep, extraPostsByPlatform],
  )

  const applyScenario = (scenarioKey: ScenarioKey) => {
    const scenario = scenarios[scenarioKey]
    setActiveScenario(scenarioKey)
    setLastLikedTag(scenario.seedTags[0] ?? null)
    setCrossAdTarget(null)
    setAdShiftStep(0)
    setBoostPostsByPlatform({ instagram: [], x: [] })
    setExtraPostsByPlatform({ instagram: [], x: [] })
    setHintText(`Perfil ativo: ${scenario.label}.`)
  }

  const resetSession = () => {
    setActiveScenario('neutro')
    setActiveTab('instagram')
    setLastLikedTag(null)
    setCrossAdTarget(null)
    setAdShiftStep(0)
    setBoostPostsByPlatform({ instagram: [], x: [] })
    setExtraPostsByPlatform({ instagram: [], x: [] })
    setHintText('Dica: curta no Instagram e veja o anuncio subir no X.')
  }

  const handleLike = (item: FeedItem) => {
    const likedTag = normalizeLikeTag(item)
    const targetPlatform: Platform = item.platform === 'instagram' ? 'x' : 'instagram'

    setBoostPostsByPlatform((prev) => {
      const targetPool = feedItems.filter(
        (candidate) =>
          candidate.platform === targetPlatform &&
          candidate.type !== 'ad' &&
          hasTag(candidate, [likedTag]),
      )

      const boosted = targetPool.slice(0, 3)
      return {
        ...prev,
        [targetPlatform]: boosted,
      }
    })

    setExtraPostsByPlatform((prev) => {
      const pool = feedItems.filter(
        (candidate) =>
          candidate.platform === item.platform &&
          candidate.type !== 'ad' &&
          candidate.id !== item.id &&
          hasTag(candidate, [likedTag]),
      )

      const existingIds = new Set(prev[item.platform].map((post) => post.id.replace(/^extra-\d+-/, '')))
      const candidate = pool.find((post) => !existingIds.has(post.id))

      if (!candidate) {
        return prev
      }

      const extraPost: FeedItem = {
        ...candidate,
        id: `extra-${prev[item.platform].length + 1}-${candidate.id}`,
      }

      return {
        ...prev,
        [item.platform]: [...prev[item.platform], extraPost],
      }
    })

    setLastLikedTag(likedTag)
    setCrossAdTarget(targetPlatform)
    setAdShiftStep((prev) => prev + 1)
    setHintText(
      `Curtiu tema ${likedTag}. No ${targetPlatform.toUpperCase()} o primeiro post agora e desse tema, com mais conteudos relacionados.`,
    )
  }

  const renderCard = (item: FeedItem) => {
    const handle = `@${item.author.toLowerCase().replace(/\s+/g, '')}`

    return (
      <article key={item.id} className={`feed-card feed-card-${item.platform}`}>
        <div className="card-top">
          <span className="avatar" aria-hidden="true">
            {item.avatarUrl ? (
              <img src={item.avatarUrl} alt="" className="avatar-img" loading="lazy" />
            ) : (
              item.author.slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="author-line">
            <strong>{item.author}</strong>
            <span>{handle}</span>
          </span>
          {item.type === 'ad' && <span className="pill-ad">anuncio</span>}
        </div>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.text}
            className="post-image"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = 'https://picsum.photos/seed/feed-fallback/900/600'
            }}
          />
        )}
        <p className="card-text">{item.text}</p>
        {item.sponsor && <p className="sponsor">Patrocinado por {item.sponsor}</p>}
        <div className="micro-actions" aria-hidden="true">
          <span>Curtir</span>
          <span>Comentar</span>
          <span>Compartilhar</span>
        </div>
        <div className="actions">
          <button type="button" onClick={() => handleLike(item)}>
            Curtir
          </button>
        </div>
      </article>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>Instagram x X</h1>
        <div className="controls-inline">
          <label htmlFor="scenario">Perfil</label>
          <select
            id="scenario"
            value={activeScenario}
            onChange={(event) => applyScenario(event.target.value as ScenarioKey)}
          >
            <option value="neutro">Publico Misto</option>
            <option value="futebol">Fan de Futebol</option>
            <option value="divapop">Fan de Diva Pop</option>
            <option value="comida">Fan de Comida</option>
            <option value="compras">Comprador Tech/Moto</option>
          </select>
          <button type="button" onClick={resetSession}>
            Resetar
          </button>
        </div>
      </header>

      <p className="hint">{hintText}</p>

      <section className="browser-shell">
        <div className="browser-tabs" role="tablist" aria-label="Sistemas de feed">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'instagram'}
            className={`tab-btn ${activeTab === 'instagram' ? 'active' : ''}`}
            onClick={() => setActiveTab('instagram')}
          >
            Instagram
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'x'}
            className={`tab-btn ${activeTab === 'x' ? 'active' : ''}`}
            onClick={() => setActiveTab('x')}
          >
            X
          </button>
        </div>

        <section className={`network-shell ${activeTab === 'instagram' ? 'ig-shell' : 'x-shell'}`}>
          <div className="network-top">
            <strong>{activeTab === 'instagram' ? 'Instagram' : 'X'}</strong>
            <span className="live-chip">{activeTab === 'instagram' ? 'Home' : 'For you'}</span>
          </div>
          <div className="feed-list">
            {(activeTab === 'instagram' ? instagramFeed : xFeed)
              .slice(0, 5)
              .map((item) => renderCard(item))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
