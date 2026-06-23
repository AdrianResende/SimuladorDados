import { useMemo, useState } from 'react'
import './App.css'
import { INTERESTS, adItems, contentItems } from './data/mockData'
import type { FeedItem, Interest, Step, UserProfile } from './types'

const INTERACTION_GOAL = 3

const buildTagWeights = (selectedIds: string[]): Record<string, number> => {
  const weights: Record<string, number> = {}
  for (const id of selectedIds) {
    const interest = INTERESTS.find((i) => i.id === id)
    if (interest) {
      for (const tag of interest.tags) {
        weights[tag] = (weights[tag] ?? 0) + 1.0
      }
    }
  }
  return weights
}

const getReasons = (item: FeedItem, profile: UserProfile): string[] => {
  const reasons = new Set<string>()
  for (const tag of item.tags) {
    if (!profile.tagWeights[tag]) continue
    const matchingInterest = INTERESTS.find(
      (i) => i.tags.includes(tag) && profile.selectedInterests.includes(i.id),
    )
    if (matchingInterest) {
      reasons.add(`${matchingInterest.emoji} Você gosta de ${matchingInterest.label}`)
    } else {
      const interactedBefore = contentItems.find(
        (ci) =>
          ci.tags.includes(tag) &&
          (profile.likedIds.includes(ci.id) ||
            profile.commentedIds.includes(ci.id) ||
            profile.watchedIds.includes(ci.id)),
      )
      if (interactedBefore) reasons.add('💡 Baseado nas suas interações')
    }
  }
  return Array.from(reasons).slice(0, 2)
}

const emptyProfile = (): UserProfile => ({
  selectedInterests: [],
  tagWeights: {},
  likedIds: [],
  commentedIds: [],
  watchedIds: [],
})

function App() {
  const [step, setStep] = useState<Step>(1)
  const [profile, setProfile] = useState<UserProfile>(emptyProfile())

  const totalInteractions =
    profile.likedIds.length + profile.commentedIds.length + profile.watchedIds.length

  const topTagEntries = useMemo(
    () => Object.entries(profile.tagWeights).sort((a, b) => b[1] - a[1]).slice(0, 6),
    [profile.tagWeights],
  )

  const maxWeight = Math.max(...topTagEntries.map(([, w]) => w), 1)

  const recommendations = useMemo(
    () =>
      contentItems
        .map((item) => ({
          item,
          score: item.tags.reduce((acc, tag) => acc + (profile.tagWeights[tag] ?? 0), 0),
          reasons: getReasons(item, profile),
        }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [profile],
  )

  const recommendedAd = useMemo(() => {
    const topTag = topTagEntries[0]?.[0]
    if (!topTag) return adItems[0]
    return adItems.find((ad) => ad.tags.includes(topTag)) ?? adItems[0]
  }, [topTagEntries])

  const topInterestLabel = (() => {
    const topTag = topTagEntries[0]?.[0]
    const interest = INTERESTS.find((i) => i.tags.includes(topTag ?? ''))
    return interest ? `${interest.emoji} ${interest.label}` : topTag ?? '—'
  })()

  const handleToggleInterest = (interest: Interest) => {
    setProfile((prev) => {
      const isSelected = prev.selectedInterests.includes(interest.id)
      const newSelected = isSelected
        ? prev.selectedInterests.filter((id) => id !== interest.id)
        : [...prev.selectedInterests, interest.id]
      return { ...prev, selectedInterests: newSelected, tagWeights: buildTagWeights(newSelected) }
    })
  }

  const handleInteraction = (item: FeedItem, type: 'like' | 'comment' | 'watch') => {
    const keyMap = { like: 'likedIds', comment: 'commentedIds', watch: 'watchedIds' } as const
    const key = keyMap[type]
    const addWeight = type === 'like' ? 0.6 : type === 'comment' ? 0.9 : 0.4

    setProfile((prev) => {
      if (prev[key].includes(item.id)) return prev
      const newWeights = { ...prev.tagWeights }
      for (const tag of item.tags) {
        newWeights[tag] = (newWeights[tag] ?? 0) + addWeight
      }
      return { ...prev, tagWeights: newWeights, [key]: [...prev[key], item.id] }
    })
  }

  const handleReset = () => {
    setStep(1)
    setProfile(emptyProfile())
  }

  // ===================== TELA 1 — Interesses =====================
  if (step === 1) {
    return (
      <main className="app-shell">
        <div className="project-banner">
          <p className="project-label">🎓 Projeto de Extensão · 8º Ano</p>
          <h1 className="project-title">
            Como os Algoritmos das Redes Sociais<br />
            decidem o que você vê
          </h1>
        </div>

        <div className="step-card">
          <div className="step-badge">Passo 1 de 3</div>
          <h2 className="step-heading">🤖 O Algoritmo Vai Te Conhecer</h2>
          <p className="step-sub">
            Escolha seus interesses — é assim que as redes sociais montam seu perfil inicial
          </p>

          <div className="interests-grid">
            {INTERESTS.map((interest) => {
              const selected = profile.selectedInterests.includes(interest.id)
              return (
                <button
                  key={interest.id}
                  type="button"
                  className={`interest-card ${selected ? 'selected' : ''}`}
                  style={{ '--ic': interest.color } as React.CSSProperties}
                  onClick={() => handleToggleInterest(interest)}
                >
                  <span className="ic-emoji">{interest.emoji}</span>
                  <span className="ic-label">{interest.label}</span>
                  {selected && <span className="ic-check">✓</span>}
                </button>
              )
            })}
          </div>

          <p className="sel-count">
            {profile.selectedInterests.length === 0
              ? 'Selecione pelo menos 1 interesse para continuar'
              : `${profile.selectedInterests.length} interesse(s) selecionado(s) ✓`}
          </p>
          <button
            type="button"
            className="cta-btn"
            disabled={profile.selectedInterests.length === 0}
            onClick={() => setStep(2)}
          >
            Algoritmo registrou! Agora interaja →
          </button>
        </div>

        <div className="explainer-box">
          <strong>💡 O que está acontecendo?</strong>
          <p>
            Quando você cria uma conta em uma rede social, ela pede seus interesses. O algoritmo
            usa isso como <em>ponto de partida</em> — mas a parte mais importante vem depois: cada
            curtida, comentário e segundo assistindo a um vídeo ensina muito mais sobre você.
          </p>
        </div>
      </main>
    )
  }

  // ===================== TELA 2 — Interações =====================
  if (step === 2) {
    const progress = Math.min(100, (totalInteractions / INTERACTION_GOAL) * 100)
    const canProceed = totalInteractions >= INTERACTION_GOAL

    return (
      <main className="app-shell">
        <div className="step-card">
          <div className="step-badge">Passo 2 de 3</div>
          <h2 className="step-heading">📱 Simule Suas Interações</h2>
          <p className="step-sub">
            Curta, comente ou assista os posts. Veja o algoritmo aprendendo ao vivo no painel!
          </p>

          <div className="progress-wrap">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-label">
              {totalInteractions}/{INTERACTION_GOAL} interações {canProceed && '🎉 Pronto!'}
            </span>
          </div>
        </div>

        <div className="feed-layout">
          <div className="feed-col">
            {contentItems.map((item) => {
              const liked = profile.likedIds.includes(item.id)
              const commented = profile.commentedIds.includes(item.id)
              const watched = profile.watchedIds.includes(item.id)
              const interacted = liked || commented || watched
              return (
                <article key={item.id} className={`sim-card ${interacted ? 'interacted' : ''}`}>
                  <div className="sim-card-top">
                    {item.avatarUrl && (
                      <img src={item.avatarUrl} alt="" className="sim-avatar" loading="lazy" />
                    )}
                    <div className="sim-author">
                      <strong>{item.author}</strong>
                      <span className="platform-chip">
                        {item.platform === 'instagram' ? '📸 Instagram' : '𝕏 X'}
                      </span>
                    </div>
                    <span className="time-ago">{item.minutesAgo}min</span>
                  </div>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="sim-img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = 'https://picsum.photos/seed/fallback/900/600'
                      }}
                    />
                  )}
                  <p className="sim-text">{item.text}</p>
                  <div className="sim-tags">
                    {item.tags.map((tag) => (
                      <span key={tag} className="sim-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="sim-actions">
                    <button
                      type="button"
                      className={`int-btn ${liked ? 'int-liked' : ''}`}
                      disabled={liked}
                      onClick={() => handleInteraction(item, 'like')}
                    >
                      ❤️ {liked ? 'Curtido' : 'Curtir'}
                    </button>
                    <button
                      type="button"
                      className={`int-btn ${commented ? 'int-commented' : ''}`}
                      disabled={commented}
                      onClick={() => handleInteraction(item, 'comment')}
                    >
                      💬 {commented ? 'Comentado' : 'Comentar'}
                    </button>
                    <button
                      type="button"
                      className={`int-btn ${watched ? 'int-watched' : ''}`}
                      disabled={watched}
                      onClick={() => handleInteraction(item, 'watch')}
                    >
                      👀 {watched ? 'Assistido' : 'Assistir'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          <aside className="algo-panel">
            <h3>🧠 O que o algoritmo<br />aprendeu sobre você:</h3>
            {topTagEntries.length === 0 ? (
              <p className="algo-empty">Interaja com os posts para ver o algoritmo aprendendo!</p>
            ) : (
              topTagEntries.map(([tag, weight]) => {
                const interest = INTERESTS.find((i) => i.tags.includes(tag))
                return (
                  <div key={tag} className="algo-row">
                    <span className="algo-label">
                      {interest?.emoji ?? '🏷️'} {tag}
                    </span>
                    <div className="algo-track">
                      <div
                        className="algo-fill"
                        style={{
                          width: `${(weight / maxWeight) * 100}%`,
                          background: interest?.color ?? '#667eea',
                        }}
                      />
                    </div>
                    <span className="algo-val">{weight.toFixed(1)}</span>
                  </div>
                )
              })
            )}
            {totalInteractions > 0 && (
              <p className="algo-note">
                Cada interação aumenta o peso dos temas. Assim o feed vai se personalizando!
              </p>
            )}
          </aside>
        </div>

        {canProceed && (
          <div className="proceed-wrap">
            <button type="button" className="cta-btn" onClick={() => setStep(3)}>
              🎯 Ver Minhas Recomendações →
            </button>
          </div>
        )}

        <div className="explainer-box">
          <strong>💡 O que está acontecendo?</strong>
          <p>
            Cada curtida, comentário e visualização ensina o algoritmo sobre seus gostos. Observe o
            painel ao lado mudando em tempo real! Posts do mesmo tema sobem no feed — e anúncios
            relacionados começam a aparecer.
          </p>
        </div>
      </main>
    )
  }

  // ===================== TELA 3 — Recomendações =====================
  return (
    <main className="app-shell">
      <div className="step-card">
        <div className="step-badge">Passo 3 de 3</div>
        <h2 className="step-heading">🎯 Recomendado Para Você</h2>
        <p className="step-sub">
          Isso é o que o algoritmo decidiu te mostrar, baseado em tudo que aprendeu sobre você
        </p>
      </div>

      <div className="profile-panel">
        <h3>📊 Seu Perfil no Algoritmo</h3>
        <div className="profile-bars">
          {topTagEntries.map(([tag, weight]) => {
            const interest = INTERESTS.find((i) => i.tags.includes(tag))
            return (
              <div key={tag} className="profile-row">
                <span className="profile-label">
                  {interest?.emoji ?? '🏷️'} {tag}
                </span>
                <div className="profile-track">
                  <div
                    className="profile-fill"
                    style={{
                      width: `${(weight / maxWeight) * 100}%`,
                      background: interest?.color ?? '#667eea',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <h3 className="recs-heading">📱 Feed Montado Para Você</h3>
      <div className="recs-grid">
        {recommendations.map(({ item, reasons }) => (
          <article key={item.id} className="rec-card">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="rec-img"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = 'https://picsum.photos/seed/fallback/900/600'
                }}
              />
            )}
            <div className="rec-body">
              <p className="rec-text">{item.text}</p>
              <div className="rec-reasons">
                {reasons.map((r) => (
                  <span key={r} className="reason-chip">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}

        {recommendedAd && (
          <article className="rec-card rec-ad-card">
            {recommendedAd.imageUrl && (
              <img
                src={recommendedAd.imageUrl}
                alt=""
                className="rec-img"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = 'https://picsum.photos/seed/fallback/900/600'
                }}
              />
            )}
            <div className="rec-body">
              <span className="ad-badge">📢 Anúncio Patrocinado</span>
              <p className="rec-text">{recommendedAd.text}</p>
              {recommendedAd.sponsor && (
                <p className="ad-sponsor">Patrocinado por {recommendedAd.sponsor}</p>
              )}
              <div className="rec-reasons">
                <span className="reason-chip reason-ad">
                  💰 Baseado no seu perfil de {topInterestLabel}
                </span>
              </div>
            </div>
          </article>
        )}
      </div>

      <div className="algo-reveal">
        <h3>🔍 Como o Algoritmo Decidiu?</h3>
        <ol className="algo-steps">
          <li>
            <strong>Dados iniciais:</strong>{' '}
            {profile.selectedInterests.length > 0
              ? profile.selectedInterests
                  .map((id) => {
                    const i = INTERESTS.find((int) => int.id === id)
                    return i ? `${i.emoji} ${i.label}` : id
                  })
                  .join(', ')
              : 'Nenhum interesse selecionado'}
          </li>
          <li>
            <strong>Interações registradas:</strong> {profile.likedIds.length} curtidas,{' '}
            {profile.commentedIds.length} comentários, {profile.watchedIds.length} visualizações
          </li>
          <li>
            <strong>Tema dominante detectado:</strong> {topInterestLabel}
          </li>
          <li>
            <strong>Resultado:</strong> Conteúdos de{' '}
            {topTagEntries
              .slice(0, 2)
              .map(([tag]) => tag)
              .join(' e ')}{' '}
            foram priorizados no feed
          </li>
          <li>
            <strong>Anúncio personalizado:</strong> Empresas pagam para aparecer no feed de quem
            tem perfil relacionado ao produto — é assim que as redes sociais ganham dinheiro!
          </li>
        </ol>
      </div>

      <button type="button" className="cta-btn reset-btn" onClick={handleReset}>
        🔄 Recomeçar Simulação
      </button>
    </main>
  )
}

export default App
