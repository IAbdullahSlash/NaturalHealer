import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { GuideMark } from './Apothecary'
import { formatMessageText } from '../utils/formatMessage'
import '../styles/Chat.css'

const timeLabel = (date) =>
  date instanceof Date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined

// Messages, typing state, suggestions and composer, shared by every chat surface
export default function ChatThread({
  messages,
  isTyping,
  error,
  input,
  onInputChange,
  onSend,
  suggestions = [],
  introTitle = 'Ask the guide',
  placeholder = 'Ask about remedies, diet, prevention…',
  inputRef,
  compact = false,
}) {
  const scrollRef = useRef(null)
  const isIntro = messages.length <= 1 && !isTyping
  // While an answer streams in, its own bubble replaces the typing dots
  const last = messages[messages.length - 1]
  const showTyping = isTyping && !(last?.role === 'assistant' && last.streaming && last.text)

  // Keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  // Grow the composer with its content, up to a limit
  useEffect(() => {
    const el = inputRef?.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [input, inputRef])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className={`chat ${compact ? 'chat-compact' : ''}`}>
      <div className="chat-scroll" ref={scrollRef}>
        {isIntro ? (
          <div className="chat-intro">
            <span className="chat-intro-mark"><GuideMark size={64} /></span>
            <h3 className="chat-intro-title">{introTitle}</h3>
            <p className="chat-intro-text">{messages[0]?.text}</p>
            {suggestions.length > 0 && (
              <div className="chat-suggestions">
                {suggestions.map((q, i) => (
                  <button
                    key={q}
                    className="chat-suggestion rise"
                    style={{ '--i': i + 1 }}
                    onClick={() => {
                      onInputChange(q)
                      inputRef?.current?.focus()
                    }}
                  >
                    {q}
                    <Icon name="arrowRight" size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="chat-messages" aria-live="polite">
            {messages.slice(1).filter(msg => msg.text).map((msg, index) =>
              msg.role === 'user' ? (
                <div key={index} className="msg msg-user" title={timeLabel(msg.timestamp)}>
                  <p className="msg-bubble">{msg.text}</p>
                </div>
              ) : (
                <div
                  key={index}
                  className={`msg msg-ai ${msg.isError ? 'msg-error' : ''} ${msg.triage ? `msg-triage-${msg.triage}` : ''} ${msg.streaming ? 'is-streaming' : ''}`}
                  title={timeLabel(msg.timestamp)}
                >
                  <span className="msg-mark" aria-hidden="true">
                    {msg.isError ? <Icon name="alert" size={16} strokeWidth={2} /> : <GuideMark size={34} />}
                  </span>
                  <div className="msg-body">
                    {formatMessageText(msg.text)}
                    {msg.sources?.length > 0 && (
                      <div className="msg-sources">
                        <p className="msg-sources-title">Sources from the knowledge base</p>
                        <ol>
                          {msg.sources.map(s => (
                            <li key={s.n} value={s.n}>
                              <Link to={s.url}>{s.title}</Link>
                              {s.review === 'draft' && <span className="msg-source-draft">Draft</span>}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {showTyping && (
              <div className="msg msg-ai" role="status" aria-label="The assistant is writing">
                <span className="msg-mark" aria-hidden="true">
                  <GuideMark size={34} busy />
                </span>
                <div className="typing"><span /><span /><span /></div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="chat-composer">
        {error && <p className="chat-error" role="alert">{error}</p>}
        <div className="composer">
          <textarea
            ref={inputRef}
            rows={1}
            className="composer-input"
            placeholder={placeholder}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            maxLength={1000}
            aria-label="Message"
          />
          <button
            className="composer-send"
            onClick={onSend}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            {isTyping ? <span className="spinner" aria-hidden="true" /> : <Icon name="arrowUp" size={18} strokeWidth={2.25} />}
          </button>
        </div>
        <p className="chat-fineprint">AI can be wrong. Check with a practitioner before acting on advice.</p>
      </div>
    </div>
  )
}
