import React, { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import AIAssistant from './AIAssistant'
import BotanicalPlate from './Botanicals'
import { Mandala } from './Garden'
import { SaveButton, ShelfTags, severityLabels } from './ConditionLedger'
import { bedFor } from '../data/kitchen'
import '../styles/DiseaseModal.css'

const EXIT_MS = 180

export default function DiseaseModal({ disease, onClose, isFavorite, onToggleFavorite }) {
  const [closing, setClosing] = useState(false)
  const closeRef = useRef(null)
  const bed = bedFor(disease.category)

  // Play the exit before unmounting; exits are quicker than entrances
  const requestClose = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, EXIT_MS)
  }

  // Lock page scroll and return focus to where it was
  useEffect(() => {
    const previous = document.activeElement
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  })

  return (
    <div className="dmodal-root" data-state={closing ? 'closing' : 'open'}>
      <div className="dmodal-scrim" onClick={requestClose} aria-hidden="true" />

      <div className="dmodal" role="dialog" aria-modal="true" aria-labelledby="dmodal-title" data-category={disease.category}>
        <article className="thali">
          <header className="thali-head">
            <Mandala size={300} className="thali-mandala" color="#C9733B" />
            <div className="thali-sprite" aria-hidden="true">
              <BotanicalPlate herb={bed.herb} size={120} drawn />
            </div>
            <div className="thali-toolbar">
              <span className="thali-katori">
                <span className="thali-bed">{bed.label}</span>
                <span className="thali-spice"><em>{bed.latin}</em> · {bed.herbName} <span className="hi" lang="hi">{bed.hindi}</span></span>
              </span>
              <div className="thali-actions">
                <SaveButton saved={isFavorite} onToggle={onToggleFavorite} label={disease.title} />
                <button ref={closeRef} className="icon-btn" onClick={requestClose} aria-label="Close">
                  <Icon name="x" />
                </button>
              </div>
            </div>

            <h2 id="dmodal-title" className="t-title thali-title">{disease.title}</h2>
            <p className="thali-desc">{disease.desc}</p>

            <dl className="thali-facts">
              <div>
                <dt>Usually lasts</dt>
                <dd>{disease.duration}</dd>
              </div>
              <div>
                <dt>Dosha</dt>
                <dd className="thali-doshas">{disease.doshas.join(', ')}</dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd className={disease.severity === 'serious' ? 'is-serious' : undefined}>
                  {severityLabels[disease.severity]}
                </dd>
              </div>
            </dl>
          </header>

          {disease.severity === 'serious' && (
            <p className="notice notice-chilli thali-warning">
              <Icon name="alert" size={18} />
              <span>
                {disease.title} needs a doctor's ongoing care. Use these remedies alongside your
                prescribed treatment, never instead of it, and tell your doctor what you take.
              </span>
            </p>
          )}

          <section className="thali-section">
            <h3 className="thali-section-title">From your shelf</h3>
            <ShelfTags disease={disease} limit={20} />
          </section>

          <section className="thali-section">
            <h3 className="thali-section-title">What to make</h3>
            <ol className="thali-remedies">
              {disease.remedies.map((remedy, index) => (
                <li key={remedy}>
                  <span className="thali-num">{index + 1}</span>
                  <span>{remedy}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="thali-section">
            <h3 className="thali-section-title">To keep it away</h3>
            <ul className="thali-prevention">
              {disease.prevention.map(tip => (
                <li key={tip}>
                  <Icon name="check" size={16} strokeWidth={2.5} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          {disease.seeDoctor?.length > 0 && (
            <section className="thali-section thali-doctor">
              <h3 className="thali-section-title">When to see a doctor</h3>
              <ul>
                {disease.seeDoctor.map(sign => (
                  <li key={sign}>
                    <Icon name="alert" size={16} strokeWidth={2.2} />
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="thali-fineprint">
            Educational information, not medical advice. Check with a qualified practitioner before
            starting a new remedy, especially if you are pregnant, nursing or on medication.
          </p>
        </article>

        <aside className="dmodal-ai">
          <AIAssistant disease={disease} />
        </aside>
      </div>
    </div>
  )
}
