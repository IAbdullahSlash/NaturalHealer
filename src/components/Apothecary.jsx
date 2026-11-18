import React, { useEffect, useState } from 'react'
import BotanicalPlate from './Botanicals'
import { ClayBowl } from './Herbs'
import '../styles/Apothecary.css'

// The site's illustrations: no people, only the herbs and the tools that prepare them.
// HerbScene is a small apothecary still life; GuideMark is the AI guide's medallion.

// Plants ink themselves in once mounted, then sway at their own pace
function useInked(delay = 200) {
  const [inked, setInked] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setInked(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return inked
}

const PLANTS = [
  { herb: 'brahmi', x: -2, w: 42, delay: 0.6, dur: 7.5 },
  { herb: 'tulsi', x: 23, w: 54, delay: 0, dur: 6.2 },
  { herb: 'saunf', x: 58, w: 42, delay: 1.1, dur: 8.4 },
]

// Seeds drifting up through warm air, at fixed spots so the scene renders the same each time
const SEEDS = [
  { x: 18, d: 0, dur: 9 }, { x: 34, d: 2.4, dur: 11 }, { x: 52, d: 4.8, dur: 10 },
  { x: 66, d: 1.2, dur: 12 }, { x: 78, d: 6, dur: 9.5 }, { x: 44, d: 7.4, dur: 13 },
]

/**
 * size: width in px (height is 1.25 × width, matching the arch it sits in).
 * still: draw everything at rest, for tests and reduced-motion screenshots.
 */
export function HerbScene({ size = 320, still = false, className = '' }) {
  const inked = useInked()
  return (
    <div
      className={`herb-scene ${still ? 'is-still' : ''} ${className}`}
      style={{ '--s': `${size}px` }}
      aria-hidden="true"
    >
      <span className="scene-sun" />
      {PLANTS.map(p => (
        <span key={p.herb} className="scene-plant" style={{ left: `${p.x}%`, width: `${p.w}%`, '--d': `${p.delay}s`, '--t': `${p.dur}s` }}>
          <BotanicalPlate herb={p.herb} size={size * p.w / 100} className={inked || still ? 'is-inking' : ''} drawn={still} />
        </span>
      ))}

      <span className="scene-leaf scene-leaf-1" />
      <span className="scene-leaf scene-leaf-2" />
      {SEEDS.map((s, i) => <span key={i} className="scene-seed" style={{ left: `${s.x}%`, '--d': `${s.d}s`, '--t': `${s.dur}s` }} />)}

      <span className="scene-ledge" />
      <span className="scene-bowl scene-bowl-left"><ClayBowl spice="haldi" size={size * 0.15} /></span>
      <span className="scene-bowl scene-bowl-right"><ClayBowl spice="jeera" size={size * 0.12} /></span>
      <span className="scene-mortar">
        <svg className="scene-steam" viewBox="0 0 60 80" aria-hidden="true">
          <path d="M18 78 C10 62 26 54 18 38 C12 26 22 18 20 4" />
          <path d="M32 78 C24 60 40 52 32 34 C26 22 36 14 34 2" />
          <path d="M44 78 C38 64 52 56 44 42 C40 32 48 24 46 10" />
        </svg>
        <BotanicalPlate herb="all" size={size * 0.34} className={inked || still ? 'is-inking' : ''} drawn={still} />
      </span>
    </div>
  )
}

/**
 * The AI guide's mark: a tulsi sprig in a round medallion with a slowly turning ring.
 * busy: livelier motion while the guide is preparing an answer.
 */
export function GuideMark({ size = 40, busy = false, className = '' }) {
  return (
    <span className={`guide-mark ${busy ? 'is-busy' : ''} ${className}`} style={{ '--s': `${size}px` }} aria-hidden="true">
      <svg className="guide-ring" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18.4" />
      </svg>
      <span className="guide-sprig">
        <BotanicalPlate herb="tulsi" size={size * 0.62} drawn />
      </span>
    </span>
  )
}
