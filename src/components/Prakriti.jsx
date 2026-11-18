import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import Icon from './Icon'
import { GuideMark } from './Apothecary'
import { Mandala } from './Garden'
import { api } from '../services/api'
import '../styles/Prakriti.css'

const DOSHA = {
  vata: { name: 'Vata', hindi: 'वात', elements: 'Air and space', icon: 'wind' },
  pitta: { name: 'Pitta', hindi: 'पित्त', elements: 'Fire and water', icon: 'flame' },
  kapha: { name: 'Kapha', hindi: 'कफ', elements: 'Earth and water', icon: 'mountain' },
}

function Result({ result, guidance, onRetake, onOpenAIChat }) {
  const order = ['vata', 'pitta', 'kapha']
  const focus = [result.dominant, result.secondary].filter(Boolean)
  return (
    <section className="pk-result" aria-labelledby="pk-result-title">
      <p className="eyebrow">Your prakriti</p>
      <h1 id="pk-result-title" className="t-title pk-result-title">{result.label}</h1>
      <p className="t-lead">
        Your answers lean towards {focus.map(d => DOSHA[d].name).join(' and ')}. Use this to choose foods and routines that
        keep you balanced, and as context when you ask Ayu a question.
      </p>

      <dl className="pk-bars">
        {order.map(d => (
          <div key={d} className={`pk-bar pk-${d}`} style={{ '--v': `${result.scores[d]}%` }}>
            <dt>
              <Icon name={DOSHA[d].icon} size={18} strokeWidth={1.7} />
              {DOSHA[d].name} <span className="hi" lang="hi">{DOSHA[d].hindi}</span>
              <span className="pk-elements">{DOSHA[d].elements}</span>
            </dt>
            <dd>
              <span className="pk-track"><span className="pk-fill" /></span>
              <span className="pk-value">{result.scores[d]}%</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="pk-guidance">
        {(focus.length ? focus : order).map(d => (
          <article key={d} className={`pk-tip pk-${d}`}>
            <h2 className="pk-tip-title">Balancing {DOSHA[d].name}</h2>
            <p>{guidance[d]}</p>
          </article>
        ))}
      </div>

      <p className="notice pk-note">
        <Icon name="info" size={18} />
        <span>
          This is a self-assessment, not a diagnosis. An Ayurvedic practitioner assesses prakriti in person, and your
          current state (vikriti) can differ from your constitution.
        </span>
      </p>

      <div className="pk-actions">
        <button type="button" className="btn btn-leaf" onClick={onOpenAIChat}>
          <Icon name="sparkle" size={16} />
          Ask Ayu with this in mind
        </button>
        <Link to="/home" className="btn btn-paper">Back to remedies</Link>
        <button type="button" className="btn btn-ghost" onClick={onRetake}>Retake assessment</button>
      </div>
    </section>
  )
}

export default function Prakriti({ user, onLogout, onOpenAIChat }) {
  const [questions, setQuestions] = useState([])
  const [guidance, setGuidance] = useState({})
  const [result, setResult] = useState(null)
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState('loading') // loading | quiz | result | error
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const headingRef = useRef(null)

  useEffect(() => {
    api('/prakriti')
      .then(data => {
        setQuestions(data.questions)
        setGuidance(data.guidance)
        setResult(data.result)
        setMode(data.result ? 'result' : 'quiz')
      })
      .catch(err => { setError(err.message); setMode('error') })
  }, [])

  // Move focus to each new question for keyboard and screen reader users
  useEffect(() => { if (mode === 'quiz') headingRef.current?.focus() }, [step, mode])

  const q = questions[step]
  const answered = Object.keys(answers).length
  const isLast = step === questions.length - 1

  const choose = (value) => {
    setAnswers(prev => ({ ...prev, [q.id]: value }))
    if (!isLast) setTimeout(() => setStep(s => Math.min(s + 1, questions.length - 1)), 220)
  }

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = await api('/prakriti', { method: 'POST', body: { answers } })
      setResult(data.result)
      setGuidance(data.guidance)
      setMode('result')
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const retake = () => {
    setAnswers({})
    setStep(0)
    setMode('quiz')
  }

  return (
    <div className="prakriti-page">
      <Navbar user={user} onLogout={onLogout} onOpenAIChat={onOpenAIChat} />
      <main id="main-content" tabIndex={-1} className="container pk-main">
        <Mandala size={560} color="#B08D57" className="pk-mandala" />

        {mode === 'loading' && (
          <div className="pk-loading" role="status"><GuideMark size={64} busy /><p>Preparing the assessment…</p></div>
        )}

        {mode === 'error' && (
          <div className="notice notice-chilli" role="alert"><Icon name="alert" size={18} />{error}</div>
        )}

        {mode === 'result' && result && (
          <Result result={result} guidance={guidance} onRetake={retake} onOpenAIChat={onOpenAIChat} />
        )}

        {mode === 'quiz' && q && (
          <section className="pk-quiz" aria-labelledby="pk-question">
            <header className="pk-quiz-head">
              <p className="eyebrow">Prakriti assessment</p>
              <p className="pk-intro">
                Twelve questions about how you are <em>most of your life</em>, not just today. Choose the answer that fits best.
              </p>
              <div className="pk-progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answered} aria-label="Questions answered">
                <span style={{ width: `${(answered / questions.length) * 100}%` }} />
              </div>
              <p className="pk-count">Question {step + 1} of {questions.length}</p>
            </header>

            <div className="pk-card" key={q.id}>
              <h1 id="pk-question" className="pk-question" tabIndex={-1} ref={headingRef}>{q.prompt}</h1>
              <div className="pk-options" role="radiogroup" aria-labelledby="pk-question">
                {q.options.map((opt, i) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={answers[q.id] === opt.value}
                    className="pk-option"
                    onClick={() => choose(opt.value)}
                  >
                    <span className="pk-option-key" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="notice notice-chilli" role="alert"><Icon name="alert" size={18} />{error}</p>}

            <div className="pk-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
                <Icon name="arrowLeft" size={16} />
                Previous
              </button>
              {isLast ? (
                <button type="button" className="btn btn-leaf" onClick={submit} disabled={saving || answered < questions.length}>
                  {saving ? <span className="spinner" aria-hidden="true" /> : null}
                  {saving ? 'Scoring…' : 'See my prakriti'}
                </button>
              ) : (
                <button type="button" className="btn btn-paper" onClick={() => setStep(s => s + 1)} disabled={!answers[q.id]}>
                  Next
                  <Icon name="arrowRight" size={16} className="btn-arrow" />
                </button>
              )}
            </div>
            {result && (
              <p className="pk-back"><button type="button" className="text-link" onClick={() => setMode('result')}>Keep my previous result ({result.label})</button></p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
