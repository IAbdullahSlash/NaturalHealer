import { describe, it, expect, vi, afterEach } from 'vitest'
import { streamChat, ApiError } from '../services/api'

// Serve an SSE body in awkward chunks, the way a network delivers it
function sseResponse(text, chunkSize = 7) {
  const bytes = new TextEncoder().encode(text)
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('streamChat', () => {
  it('joins the streamed answer and reports each event', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(
      'event: meta\ndata: {"chatId":"c1","triage":"none"}\n\n' +
      'event: delta\ndata: {"text":"Tulsi tea "}\n\n' +
      'event: delta\ndata: {"text":"with honey."}\n\n' +
      'event: done\ndata: {"chatId":"c1"}\n\n',
    )))
    const seen = []
    const result = await streamChat({ message: 'cold' }, e => seen.push(e.type))
    expect(result).toEqual({ chatId: 'c1', triage: 'none', text: 'Tulsi tea with honey.' })
    expect(seen).toEqual(['meta', 'delta', 'delta', 'done'])
  })

  it('turns a streamed error into an ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse('event: error\ndata: {"message":"The guide is busy."}\n\n')))
    const err = await streamChat({ message: 'cold' }).catch(e => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('The guide is busy.')
  })

  it('shows the server message when the request is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Sign in to continue.' }), { status: 401 })))
    await expect(streamChat({ message: 'cold' })).rejects.toMatchObject({ message: 'Sign in to continue.', status: 401 })
  })
})
