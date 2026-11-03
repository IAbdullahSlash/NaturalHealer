import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingPage from '../components/LandingPage'
import { herbs } from '../data/knowledge/herbs'

describe('landing page', () => {
  it('shows the knowledge base figures from the current data and says entries are drafts', () => {
    render(<MemoryRouter><LandingPage user={null} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'What Vanya answers from.' })).toBeTruthy()
    const herbFigure = screen.getByText('herb and kitchen entries').parentElement
    expect(herbFigure.querySelector('strong').textContent).toBe(String(herbs.length))
    const reviewed = herbs.filter(h => h.review?.status === 'reviewed').length
    if (reviewed === 0) expect(screen.getByText(/Every entry is still a draft/)).toBeTruthy()
  })
})
