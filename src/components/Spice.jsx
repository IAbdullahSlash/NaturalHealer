import React, { useMemo } from 'react'

// Procedurally drawn spice fills: powders are heaped grain, seeds are
// individually placed and lit. Rendered once per spice and size, then cached.

const powders = {
  haldi: { base: '#DC9A16', grains: ['#C4830F', '#F0B935', '#B5760C', '#F6C752', '#E7A923'] },
  saunth: { base: '#CBA674', grains: ['#B58F5C', '#E0C292', '#A5834F', '#D8B886'] },
  dalchini: { base: '#8C4828', grains: ['#73381F', '#A65A35', '#64301A', '#9A5130'] },
  triphala: { base: '#6B4A2C', grains: ['#57391F', '#7E5A38', '#4A3019', '#8A6643'] },
  ashwagandha: { base: '#C5AE85', grains: ['#AE9670', '#D8C49E', '#9E8762'] },
  brahmi: { base: '#6C7B45', grains: ['#5A6838', '#7F8F55', '#4D5A2F'] },
  arjuna: { base: '#7A4B35', grains: ['#643A28', '#8E5B43', '#58321F'] },
  karela: { base: '#5F7B3B', grains: ['#4E6830', '#73914A', '#445B28'] },
  isabgol: { base: '#E6DCCB', grains: ['#D9CDB8', '#F0E8DA', '#CFC2AA', '#E0D3BE'] },
  mulethi: { base: '#B8894A', grains: ['#A3763C', '#C99A5A', '#8F6531', '#D4A968'] },
  amla: { base: '#8A8A4A', grains: ['#77783D', '#9C9C58', '#666733', '#ABAA66'] },
}

const liquids = {
  doodh: { base: '#F1EEE6', edge: '#D9D4C8' },
  chaas: { base: '#E9E7DB', edge: '#CFCBBC' },
  ghee: { base: '#E3B447', edge: '#B98A22' },
  shahad: { base: '#C77A18', edge: '#8F520C' },
  'til-tel': { base: '#C99A2E', edge: '#9C731A' },
  'nariyal-tel': { base: '#ECE8DB', edge: '#CFC9B8' },
  aloe: { base: '#BFD3A0', edge: '#93AD71' },
  nimbu: { base: '#E8D658', edge: '#C2AE2E' },
}

const seeds = {
  rai: { base: '#17110E', colors: ['#2B211B', '#3A2B21', '#22190F', '#4A3524'], rx: 0.022, ry: 0.021, ridge: false },
  ajwain: { base: '#55492C', colors: ['#9C8A55', '#8A7845', '#B09C66', '#77663A'], rx: 0.021, ry: 0.012, ridge: true },
  jeera: { base: '#43301B', colors: ['#8A6136', '#7A532B', '#9E7246', '#6A4724'], rx: 0.036, ry: 0.0105, ridge: true },
  elaichi: { base: '#47592E', colors: ['#7F9A52', '#8EA85F', '#6E8A45', '#9CB36D'], rx: 0.07, ry: 0.04, ridge: true },
  saunf: { base: '#4C5A2C', colors: ['#8E9B55', '#7E8C48', '#A0AD66', '#6F7D3D'], rx: 0.034, ry: 0.012, ridge: true },
  methi: { base: '#6B5320', colors: ['#C49A3A', '#B08630', '#D3AA4A', '#9C7526'], rx: 0.02, ry: 0.014, ridge: false },
  'kali-mirch': { base: '#120E0B', colors: ['#2C241E', '#3A2E25', '#211A15'], rx: 0.03, ry: 0.029, ridge: false },
  sendha: { base: '#C9A9A2', colors: ['#E9CFC8', '#D8B7AF', '#F3E0DB', '#C79E95'], rx: 0.03, ry: 0.024, ridge: false },
  tulsi: { base: '#22301A', colors: ['#3F5A2C', '#4C6B34', '#355024', '#5A7A3E'], rx: 0.075, ry: 0.042, ridge: true },
  neem: { base: '#1F2C17', colors: ['#4A6A2E', '#3D5B26', '#57793A', '#30481E'], rx: 0.08, ry: 0.03, ridge: true },
  pudina: { base: '#1E3A1E', colors: ['#4E8A3E', '#5E9C48', '#3F7533', '#6FAE55'], rx: 0.07, ry: 0.045, ridge: true },
  'curry-patta': { base: '#1A2A14', colors: ['#3E6A2A', '#4B7A32', '#335A22', '#578A3C'], rx: 0.085, ry: 0.034, ridge: true },
  dhania: { base: '#6B5532', colors: ['#B89A62', '#C9AC73', '#A78A54', '#D2B884'], rx: 0.03, ry: 0.028, ridge: true },
  pippali: { base: '#1E1712', colors: ['#4A3A2C', '#5A4636', '#3A2D22'], rx: 0.07, ry: 0.018, ridge: true },
  alsi: { base: '#3A2414', colors: ['#7A4A26', '#8C5A30', '#6A3D1E', '#9A6638'], rx: 0.03, ry: 0.016, ridge: false },
  anar: { base: '#5A0E16', colors: ['#B3243A', '#C8324A', '#9A1B2E', '#D9475D'], rx: 0.03, ry: 0.024, ridge: false },
}

function drawLiquid(ctx, w, spec, rand) {
  // A still surface: depth toward the rim, a bright meniscus line, faint ripples and motes
  const g = ctx.createRadialGradient(w * 0.46, w * 0.42, w * 0.05, w * 0.5, w * 0.5, w * 0.52)
  g.addColorStop(0, spec.base)
  g.addColorStop(0.72, spec.base)
  g.addColorStop(0.93, spec.edge)
  g.addColorStop(1, spec.base)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, w)
  // Surface variation: soft low-contrast blotches
  for (let i = 0; i < 26; i++) {
    const x = rand() * w
    const y = rand() * w
    const r = w * (0.06 + rand() * 0.12)
    const c = ctx.createRadialGradient(x, y, 0, x, y, r)
    const light = rand() < 0.5
    c.addColorStop(0, light ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)')
    c.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Ripples from the centre
  ctx.lineWidth = Math.max(1, w * 0.004)
  for (let k = 1; k <= 3; k++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.09 - k * 0.02})`
    ctx.beginPath()
    ctx.arc(w * 0.5, w * 0.5, w * (0.11 * k + 0.04), 0, Math.PI * 2)
    ctx.stroke()
  }
  // Meniscus: the surface climbs the steel at the rim
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = Math.max(1, w * 0.012)
  ctx.beginPath()
  ctx.arc(w * 0.5, w * 0.5, w * 0.47, Math.PI * 0.9, Math.PI * 1.9)
  ctx.stroke()
  // A few motes floating on top
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + rand() * 0.1})`
    ctx.beginPath()
    ctx.arc(rand() * w, rand() * w, w * (0.004 + rand() * 0.006), 0, Math.PI * 2)
    ctx.fill()
  }
  const r = ctx.createRadialGradient(w * 0.36, w * 0.3, 0, w * 0.36, w * 0.3, w * 0.3)
  r.addColorStop(0, 'rgba(255,255,255,0.45)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = r
  ctx.beginPath()
  ctx.ellipse(w * 0.36, w * 0.3, w * 0.26, w * 0.12, -0.5, 0, Math.PI * 2)
  ctx.fill()
}

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function heap(ctx, w) {
  // Light falls from above-left onto a mounded surface
  const g = ctx.createRadialGradient(w * 0.4, w * 0.36, w * 0.05, w * 0.5, w * 0.5, w * 0.62)
  g.addColorStop(0, 'rgba(255,255,255,0.20)')
  g.addColorStop(0.55, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, w)
}

function drawPowder(ctx, w, spec, rand) {
  ctx.fillStyle = spec.base
  ctx.fillRect(0, 0, w, w)
  const count = Math.round(w * w * 0.32)
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.35 + rand() * 0.6
    ctx.fillStyle = spec.grains[(rand() * spec.grains.length) | 0]
    const s = rand() < 0.94 ? 1 : 2
    ctx.fillRect(rand() * w, rand() * w, s, s)
  }
  // A few soft clumps so it reads as powder rather than noise
  for (let i = 0; i < 40; i++) {
    const r = w * (0.01 + rand() * 0.03)
    const x = rand() * w
    const y = rand() * w
    const c = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
    c.addColorStop(0, 'rgba(255,255,255,0.18)')
    c.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 1
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  heap(ctx, w)
}

function drawSeeds(ctx, w, spec, rand) {
  ctx.fillStyle = spec.base
  ctx.fillRect(0, 0, w, w)
  const rx = spec.rx * w
  const ry = spec.ry * w
  const count = Math.round(((w * w) / (Math.PI * rx * ry)) * 1.5)
  for (let i = 0; i < count; i++) {
    const x = rand() * w
    const y = rand() * w
    const a = rand() * Math.PI
    const k = 0.8 + rand() * 0.4
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    // Contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.beginPath()
    ctx.ellipse(rx * 0.12, ry * 0.35, rx * k, ry * k, 0, 0, Math.PI * 2)
    ctx.fill()
    // Body
    ctx.fillStyle = spec.colors[(rand() * spec.colors.length) | 0]
    ctx.beginPath()
    ctx.ellipse(0, 0, rx * k, ry * k, 0, 0, Math.PI * 2)
    ctx.fill()
    // Ridge or seam along the seed
    if (spec.ridge) {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'
      ctx.lineWidth = Math.max(0.6, ry * 0.18)
      ctx.beginPath()
      ctx.moveTo(-rx * k * 0.8, 0)
      ctx.lineTo(rx * k * 0.8, 0)
      ctx.stroke()
    }
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.ellipse(-rx * 0.25, -ry * 0.35, rx * k * 0.45, ry * k * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  heap(ctx, w)
}

const cache = new Map()
const SEEDS = {
  haldi: 11, saunth: 23, dalchini: 37, rai: 41, ajwain: 53, jeera: 67, elaichi: 79, tulsi: 83, neem: 89,
  pudina: 97, dhania: 101, pippali: 103, alsi: 107, anar: 109, 'curry-patta': 113 }

export function spiceTexture(spice, size) {
  if (typeof document === 'undefined') return ''
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  // Round up to a bucket so neighbouring sizes share one render
  const bucket = [48, 96, 160, 240, 320].find(b => b >= size) || 320
  const key = `${spice}-${bucket}-${dpr}`
  if (cache.has(key)) return cache.get(key)

  const w = Math.round(bucket * dpr)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = w
  const ctx = canvas.getContext('2d')
  const rand = rng(SEEDS[spice] || 1)
  if (liquids[spice]) drawLiquid(ctx, w, liquids[spice], rand)
  else if (powders[spice]) drawPowder(ctx, w, powders[spice], rand)
  else drawSeeds(ctx, w, seeds[spice] || seeds.rai, rand)

  const url = `url(${canvas.toDataURL('image/jpeg', 0.86)})`
  cache.set(key, url)
  return url
}

export default function SpiceFill({ spice, size = 96, className = '' }) {
  const texture = useMemo(() => spiceTexture(spice, size), [spice, size])
  return <span className={`spice-fill ${className}`} style={{ backgroundImage: texture }} aria-hidden="true" />
}
