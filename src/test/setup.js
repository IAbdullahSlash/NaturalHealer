import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom lacks these; the pages only use them for motion and scrolling
window.scrollTo = () => {}
window.matchMedia = window.matchMedia || ((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))

// No test talks to the real Firebase project
vi.mock('../services/firebase', () => ({ auth: { currentUser: null }, default: {} }))

afterEach(cleanup)
