import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom lacks these; the pages only use them for motion and scrolling
window.scrollTo = () => {}
// jsdom has no canvas; drawing calls do nothing and return more of the same
const noop = new Proxy(function () {}, { get: () => noop, apply: () => noop, set: () => true })
HTMLCanvasElement.prototype.getContext = () => noop
window.matchMedia =window.matchMedia || ((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))

// No test talks to the real Firebase project
vi.mock('../services/firebase', () => ({ auth: { currentUser: null }, default: {} }))

afterEach(cleanup)
