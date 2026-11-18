import React, { useState, useRef, useEffect } from 'react'
import { validateUserInput } from '../services/geminiService'
import { streamChat } from '../services/api'
import { getUserChatSessions, getChatSessionMessages } from '../services/chatHistoryService'
import ChatThread from './ChatThread'
import Icon from './Icon'
import { GuideMark } from './Apothecary'
import '../styles/FloatingAIChat.css'

const GREETING = 'Describe how you feel, or ask about any herb, food or daily habit. I answer from an Ayurvedic point of view and will tell you when something needs a doctor.'

const greetingMessage = () => ({ role: 'assistant', text: GREETING, timestamp: new Date() })

const quickQuestions = [
  'What helps a tension headache naturally?',
  'Which foods support immunity in winter?',
  'How can I calm my mind before sleep?',
]

const EXIT_MS = 200

function relativeDay(date) {
  if (!date) return ''
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function FloatingAIChat({ isOpen, onClose, user }) {
  const [messages, setMessages] = useState([greetingMessage()])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState(null)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [chatSessions, setChatSessions] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [rendered, setRendered] = useState(isOpen)
  const [closing, setClosing] = useState(false)
  const inputRef = useRef(null)

  // Stay mounted long enough to play the exit, which leaves the way it came in
  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      setClosing(false)
      return
    }
    if (!rendered) return
    setClosing(true)
    const timer = setTimeout(() => {
      setRendered(false)
      setClosing(false)
      setShowHistory(false)
    }, EXIT_MS)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Load chat sessions when the panel opens
  useEffect(() => {
    if (user && isOpen) {
      loadChatSessions()
    }
  }, [user, isOpen])

  useEffect(() => {
    if (isOpen && !showHistory) inputRef.current?.focus()
  }, [isOpen, showHistory])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showHistory) setShowHistory(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, showHistory, onClose])

  const loadChatSessions = async () => {
    if (!user) return
    const result = await getUserChatSessions()
    if (result.success) {
      setChatSessions(result.sessions)
    } else {
      console.error('Failed to load sessions:', result.error)
    }
  }

  // The server creates the conversation with the first message, so a new chat is just a blank slate
  const createNewSession = () => {
    setCurrentSessionId(null)
    setMessages([greetingMessage()])
    setShowHistory(false)
    setError(null)
  }

  const loadChatSession = async (sessionId) => {
    const result = await getChatSessionMessages(sessionId)
    if (result.success) {
      setMessages([greetingMessage(), ...result.messages.map(m => ({ role: m.role, text: m.text, triage: m.triage, sources: m.sources, timestamp: m.timestamp }))])
      setCurrentSessionId(sessionId)
      setShowHistory(false)
    } else {
      setError(result.error)
    }
  }

  const handleSend = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isTyping) return

    if (!validateUserInput(trimmedInput)) {
      setError('Please enter a question between 2 and 1000 characters.')
      return
    }

    setError(null)
    const previousSessionId = currentSessionId
    setMessages(prev => [
      ...prev,
      { role: 'user', text: trimmedInput, timestamp: new Date() },
      { role: 'assistant', text: '', timestamp: new Date(), streaming: true },
    ])
    setInput('')
    setIsTyping(true)

    // Update the answer bubble (always the last message) as text arrives
    const patchAnswer = (fn) => setMessages(prev => {
      const next = prev.slice()
      next[next.length - 1] = { ...next[next.length - 1], ...fn(next[next.length - 1]) }
      return next
    })

    try {
      const result = await streamChat({ message: trimmedInput, chatId: currentSessionId }, (event) => {
        if (event.type === 'meta' && event.chatId) setCurrentSessionId(event.chatId)
        if (event.type === 'meta' && event.triage !== 'none') patchAnswer(() => ({ triage: event.triage }))
        if (event.type === 'delta') patchAnswer(m => ({ text: m.text + event.text }))
        if (event.type === 'done') patchAnswer(() => ({ sources: event.sources || [] }))
      })
      patchAnswer(() => ({ streaming: false }))
      if (result.chatId) loadChatSessions()
    } catch (err) {
      console.error('AI Response Error:', err)
      // A failed first message leaves no conversation on the server
      setCurrentSessionId(previousSessionId)
      patchAnswer(m => ({
        streaming: false,
        isError: !m.text,
        text: m.text || err.message,
      }))
    } finally {
      setIsTyping(false)
      inputRef.current?.focus()
    }
  }

  if (!rendered) return null

  return (
    <div className="fchat-root" data-state={closing ? 'closing' : 'open'}>
      <div className="fchat-scrim" onClick={onClose} aria-hidden="true" />

      <section className="fchat" role="dialog" aria-modal="true" aria-label="AI wellness guide">
        <header className="fchat-head">
          {showHistory ? (
            <button className="icon-btn" onClick={() => setShowHistory(false)} aria-label="Back to conversation">
              <Icon name="arrowLeft" />
            </button>
          ) : (
            <span className="fchat-mark" aria-hidden="true"><GuideMark size={44} /></span>
          )}

          <div className="fchat-titles">
            <h2 className="fchat-title">{showHistory ? 'Past conversations' : 'Ayu'}</h2>
            {!showHistory && <p className="fchat-sub">AI Ayurveda guide</p>}
          </div>

          <div className="fchat-actions">
            {!showHistory && (
              <>
                <button className="icon-btn" onClick={() => setShowHistory(true)} aria-label="Past conversations" title="Past conversations">
                  <Icon name="history" size={19} />
                </button>
                <button className="icon-btn" onClick={createNewSession} aria-label="New conversation" title="New conversation">
                  <Icon name="plus" size={20} />
                </button>
              </>
            )}
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" size={20} />
            </button>
          </div>
        </header>

        <div className="fchat-body">
          {showHistory ? (
            <div className="fchat-history">
              {chatSessions.length === 0 ? (
                <div className="fchat-empty">
                  <Icon name="chat" size={28} strokeWidth={1.5} />
                  <p>No conversations yet.</p>
                  <span>Your chats are saved here automatically.</span>
                </div>
              ) : (
                <ul className="fchat-sessions">
                  {chatSessions.map(session => (
                    <li key={session.id}>
                      <button
                        className="fchat-session"
                        aria-current={currentSessionId === session.id ? 'true' : undefined}
                        onClick={() => loadChatSession(session.id)}
                      >
                        <span className="fchat-session-title">{session.title}</span>
                        <span className="fchat-session-meta">
                          {session.messageCount} {session.messageCount === 1 ? 'question' : 'questions'} · {relativeDay(session.updatedAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <ChatThread
              messages={messages}
              isTyping={isTyping}
              error={error}
              input={input}
              onInputChange={(value) => {
                setInput(value)
                if (error) setError(null)
              }}
              onSend={handleSend}
              suggestions={quickQuestions}
              introTitle={`Hello${user?.displayName && user.displayName !== 'User' ? `, ${user.displayName.split(' ')[0]}` : ''}.`}
              inputRef={inputRef}
            />
          )}
        </div>
      </section>
    </div>
  )
}
