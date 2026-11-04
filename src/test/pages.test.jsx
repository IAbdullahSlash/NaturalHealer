import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SitePage from '../components/SitePage'
import HerbPages from '../components/HerbPages'
import { herbs } from '../data/knowledge/herbs'
import { diseases } from '../data/diseases'
import compounds from '../data/knowledge/compounds'

const at = (path, element, pattern = path) => render(
  <MemoryRouter initialEntries={[path]}><Routes><Route path={pattern} element={element} /></Routes></MemoryRouter>,
)

const title = () => screen.getByRole('heading', { level: 1 }).textContent

describe('public pages', () => {
  it.each(['about', 'safety', 'privacy', 'terms', 'remedies', 'ingredients', 'dataset'])('%s renders a heading', (page) => {
    at(`/${page}`, <SitePage page={page} user={null} />)
    expect(title().length).toBeGreaterThan(0)
  })

  it('every condition page renders its title', () => {
    for (const d of diseases) {
      const { unmount } = at(`/conditions/${d.id}`, <SitePage user={null} />, '/conditions/:conditionId')
      expect(title()).toContain(d.title)
      unmount()
    }
  })

  it('every herb page renders its name', () => {
    for (const h of herbs) {
      const { unmount } = at(`/herbs/${h.id}`, <HerbPages user={null} />, '/herbs/:herbId')
      expect(title()).toContain(h.name)
      unmount()
    }
  })

  it('shows plant chemistry only for herbs Duke covers, and every entry belongs to a herb', () => {
    const ids = new Set(herbs.map(h => h.id))
    for (const id of Object.keys(compounds.herbs)) expect(ids.has(id)).toBe(true)

    at('/herbs/haldi', <HerbPages user={null} />, '/herbs/:herbId')
    expect(screen.getByRole('heading', { name: 'Plant chemistry' })).toBeTruthy()
    expect(screen.getByText('Curcumin')).toBeTruthy()
  })
})
