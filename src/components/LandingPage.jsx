import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Icon from './Icon'
import Vaidya from './Vaidya'
import BotanicalPlate, { HerbMark } from './Botanicals'
import { HerbPlates, ClayBowl } from './Herbs'
import { Mandala, VineDivider } from './Garden'
import ConditionLedger from './ConditionLedger'
import { diseases } from '../data/diseases'
import { beds, bedFor, ingredientsFor, shelfInUse, totalRemedies } from '../data/kitchen'
import { useReveal, useParallax } from '../hooks/useGardenMotion'
import '../styles/LandingPage.css'

// The herb tray animates a whole belt, so its code loads after the rest of the page
const HerbConveyor = lazy(() => import('./HerbConveyor'))

const counts = Object.fromEntries(
  beds.map(b => [b.id, b.id === 'all' ? diseases.length : diseases.filter(d => d.category === b.id).length])
)

// The shelf in three tiers: the jars reached for most sit on top, in bigger bowls
const shelves = [
  { id: 'most', size: 84, label: 'Used for 3 or more conditions', test: n => n >= 3 },
  { id: 'two', size: 66, label: 'Used for 2 conditions', test: n => n === 2 },
  { id: 'one', size: 52, label: 'Used for 1 condition', test: n => n === 1 },
]
  .map(tier => ({ ...tier, items: shelfInUse.filter(i => tier.test(i.conditions.length)) }))
  .filter(tier => tier.items.length > 0)

// The three doshas, as Ayurveda describes them
const doshas = [
  {
    id: 'vata', name: 'Vata', hindi: 'वात', elements: 'Air and space', icon: 'wind',
    governs: 'Movement: breath, circulation, nerves and the restless mind.',
    signs: 'When it runs high: dryness, anxiety, poor sleep, aching joints.',
  },
  {
    id: 'pitta', name: 'Pitta', hindi: 'पित्त', elements: 'Fire and water', icon: 'flame',
    governs: 'Transformation: digestion, metabolism, warmth and sharp focus.',
    signs: 'When it runs high: acidity, inflammation, irritability, rashes.',
  },
  {
    id: 'kapha', name: 'Kapha', hindi: 'कफ', elements: 'Earth and water', icon: 'mountain',
    governs: 'Structure: strength, immunity, lubrication and steadiness.',
    signs: 'When it runs high: congestion, heaviness, sluggish digestion.',
  },
]

const doshaCount = (id) => diseases.filter(d => d.doshas.includes(id)).length

// Knowledge base figures, computed at build time in vite.config.js
const kb = __KB_STATS__

// Herbs for the tray, prepared in vite.config.js. The chip shows the Hindi name and the
// ring colour shows how strong the evidence is.
const { items: trayHerbs, legend: trayLegend } = __KB_TRAY__
const trayItems = trayHerbs.map(h => ({
  ...h,
  price: h.hindi,
  details: [
    h.part,
    h.evidence,
    `${h.cautions} ${h.cautions === 1 ? 'caution' : 'cautions'}`,
    ...(h.interactions ? [`${h.interactions} medicine ${h.interactions === 1 ? 'interaction' : 'interactions'}`] : []),
  ],
  sections: [
    { title: 'Benefits', items: h.benefits, footnote: `As described in Ayurveda. Evidence: ${h.evidence.toLowerCase()}.` },
    { title: 'Traditionally used for', items: h.uses },
    { title: 'Remedies you can make', items: h.remedies.map(r => ({ text: r.text, note: `For ${r.condition.toLowerCase()}`, to: `/conditions/${r.conditionId}` })) },
  ],
}))
const trayLabels = { add: 'Open herb page', close: 'Close', previous: 'Previous herb', next: 'Next herb', pause: 'Pause the tray' }
const trayArt = (item, size) => <ClayBowl spice={item.fill} size={size} />

// How the product works, stated plainly
const method = [
  {
    icon: 'leaf',
    title: 'Botanical identity',
    text: `Every plant carries its accepted botanical name from Kew's World Checklist, its names in ${kb.languages} Indian languages, and the compounds USDA researchers have recorded in it, beside the household name you already know.`,
  },
  {
    icon: 'shield',
    title: 'Safety before remedy',
    text: 'Each herb lists who should avoid it and which medicines it interacts with. Those covered by US National Institutes of Health safety sources have been checked against them. Serious conditions are flagged for a doctor, with remedies offered only as support.',
  },
  {
    icon: 'sparkle',
    title: 'An assistant with limits',
    text: 'Vanya, the AI guide, answers from this knowledge base and shows the entries it used. Signs of an emergency get a "seek care now" reply instead of a remedy, and it says so when a question is beyond what it covers.',
  },
]

// What the knowledge base holds today, including what is still missing
const kbFacts = [
  { value: kb.herbs, label: 'herb and kitchen entries', note: 'Classical properties, uses, adult amounts and evidence ratings' },
  { value: kb.cautions + kb.interactions, label: 'safety notes', note: `${kb.cautions} cautions for groups such as pregnancy and children, and ${kb.interactions} medicine interactions` },
  { value: kb.safetyChecked, label: 'herbs checked against NIH', note: 'Cross-checked with NCCIH fact sheets and the LiverTox database' },
  { value: kb.regionalNames, label: 'names in Indian languages', note: `Hindi, Tamil, Bengali and ${kb.languages - 3} more, so you can search the way you speak` },
  { value: kb.withChemistry, label: 'plants with chemistry', note: "Recorded compounds from the USDA's Dr. Duke databases" },
  { value: kb.coded, label: 'conditions with ICD-11 codes', note: "Matched to the World Health Organization's classification" },
]

function matches(disease, query) {
  const q = query.toLowerCase()
  return (
    disease.title.toLowerCase().includes(q) ||
    disease.desc.toLowerCase().includes(q) ||
    ingredientsFor(disease).some(i =>
      i.name.toLowerCase().includes(q) || (i.english || '').includes(q) || i.hindi.includes(query)
    )
  )
}

export default function LandingPage({ user, onLogout, onOpenAIChat }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [bed, setBed] = useState('all')
  const [ingredient, setIngredient] = useState(null)
  const [dosha, setDosha] = useState(null)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const heroRef = useRef(null)
  const ledgerRef = useRef(null)

  useReveal(rootRef)
  useParallax(heroRef)

  const continueTo = () => navigate(user ? '/home' : '/signup')

  useEffect(() => {
    if (!location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [location.hash])

  const results = useMemo(
    () => (query.trim().length > 1 ? diseases.filter(d => matches(d, query.trim())).slice(0, 5) : []),
    [query]
  )

  const shelfItem = shelfInUse.find(i => i.id === ingredient)
  const doshaItem = doshas.find(d => d.id === dosha)
  const listed = useMemo(() => {
    if (shelfItem) return diseases.filter(d => shelfItem.conditions.includes(d.id))
    if (doshaItem) return diseases.filter(d => d.doshas.includes(doshaItem.id))
    return bed === 'all' ? diseases : diseases.filter(d => d.category === bed)
  }, [bed, shelfItem, doshaItem])

  const current = bedFor(bed)

  const showLedger = () => ledgerRef.current?.scrollIntoView({ block: 'start' })

  const pickBed = (id) => {
    setIngredient(null)
    setDosha(null)
    setBed(id)
  }

  const pickResult = (disease) => {
    navigate(`/conditions/${disease.id}`)
  }

  const pickIngredient = (id) => {
    setDosha(null)
    setIngredient(id)
    requestAnimationFrame(showLedger)
  }

  const pickDosha = (id) => {
    setIngredient(null)
    setDosha(id)
    requestAnimationFrame(showLedger)
  }

  const clearFilter = () => {
    setIngredient(null)
    setDosha(null)
  }

  const ledgerTitle = shelfItem
    ? <>Remedies with {shelfItem.name} <span className="hi" lang="hi">{shelfItem.hindi}</span></>
    : doshaItem
      ? <>Conditions linked to {doshaItem.name} <span className="hi" lang="hi">{doshaItem.hindi}</span></>
      : bed === 'all' ? 'All conditions' : current.label

  return (
    <div className="landing" ref={rootRef}>
      <Navbar user={user} onLogout={onLogout} onOpenAIChat={onOpenAIChat} overHero />

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="hero" ref={heroRef} aria-labelledby="hero-title">
          <div className="hero-botanical hero-botanical-left" aria-hidden="true">
            <BotanicalPlate herb="neem" size={220} />
          </div>

          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow hero-eyebrow">Ayurveda <span lang="hi">· आयुर्वेद</span></p>
              <h1 id="hero-title" className="t-display hero-title">
                Ayurvedic care, <em>read with evidence.</em>
              </h1>
              <p className="t-lead hero-lead">
                A reference of {diseases.length} everyday conditions, {totalRemedies} kitchen remedies and {kb.herbs} herb entries
                with botanical names, cautions and medicine interactions. Vanya, the AI guide, answers your
                questions from these entries, shows its sources and tells you plainly when to see a doctor.
              </p>

              <form className="hero-search" role="search" onSubmit={(e) => {
                e.preventDefault()
                if (results[0]) pickResult(results[0])
              }}>
                <label htmlFor="hero-query" className="visually-hidden">Search a condition or ingredient</label>
                <Icon name="search" size={20} className="hero-search-icon" />
                <input
                  id="hero-query"
                  className="hero-input"
                  type="search"
                  autoComplete="off"
                  placeholder="Search a condition or ingredient, like “cold” or “haldi”"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-controls="hero-results"
                />
                <button type="submit" className="btn btn-leaf hero-search-btn">Search</button>

                {query.trim().length > 1 && (
                  <ul id="hero-results" className="hero-results" aria-live="polite">
                    {results.length === 0 ? (
                      <li className="hero-empty">No condition or ingredient matches “{query.trim()}” yet.</li>
                    ) : results.map(d => (
                      <li key={d.id}>
                        <button type="button" className="hero-result" data-category={d.category} onClick={() => pickResult(d)}>
                          <HerbMark herb={bedFor(d.category).herb} size={34} />
                          <span className="hero-result-title">{d.title}</span>
                          <span className="hero-result-bed">{bedFor(d.category).label}</span>
                          <Icon name="arrowRight" size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </form>

              <dl className="hero-facts">
                <div><dt>Conditions</dt><dd>{diseases.length}</dd></div>
                <div><dt>Remedies</dt><dd>{totalRemedies}</dd></div>
                <div><dt>Herb entries</dt><dd>{kb.herbs}</dd></div>
              </dl>
            </div>

            <div className="hero-stage">
              <div className="hero-arch" aria-hidden="true">
                <Mandala size={460} color="#B08D57" className="hero-mandala" />
                <div className="hero-vaidya">
                  <Vaidya size={330} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Method */}
        <section className="section method-section" aria-labelledby="method-title">
          <div className="container">
            <header className="section-head" data-reveal>
              <p className="eyebrow">Method</p>
              <h2 id="method-title" className="t-title">Tradition, held to a plain standard.</h2>
            </header>
            <ol className="method-grid">
              {method.map((m, i) => (
                <li key={m.title} className="method-item" data-reveal style={{ '--d': i }}>
                  <span className="method-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="method-icon"><Icon name={m.icon} size={22} strokeWidth={1.6} /></span>
                  <h3 className="method-title">{m.title}</h3>
                  <p className="method-text">{m.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What the knowledge base holds, and what it doesn't yet */}
        <section className="section kb-section-landing" aria-labelledby="kb-title">
          <div className="container">
            <header className="section-head" data-reveal>
              <p className="eyebrow">Knowledge base</p>
              <h2 id="kb-title" className="t-title">What Vanya answers from.</h2>
              <p className="t-lead">
                Built from open, citable sources and checked against official safety data. Where sources disagree
                or we aren't sure, the entry says so instead of guessing.
              </p>
            </header>
            <ul className="kb-facts">
              {kbFacts.map((f, i) => (
                <li key={f.label} data-reveal style={{ '--d': i }}>
                  <strong>{f.value}</strong>
                  <span className="kb-facts-label">{f.label}</span>
                  <span className="kb-facts-note">{f.note}</span>
                </li>
              ))}
            </ul>
            <p className="kb-facts-draft" data-reveal>
              <Icon name="info" size={18} />
              <span>
                {kb.reviewed === 0
                  ? 'Every entry is still a draft: a qualified Ayurvedic practitioner has not reviewed them yet, and each herb page says so.'
                  : `${kb.reviewed} of ${kb.herbs} entries have been reviewed by a qualified Ayurvedic practitioner; the rest are marked as drafts.`}
              </span>
            </p>
            <div className="kb-facts-actions" data-reveal>
              <Link to="/herbs" className="btn btn-leaf">Browse the herbs <Icon name="arrowRight" size={17} className="btn-arrow" /></Link>
              <Link to="/safety" className="btn btn-paper">Read the safety guide</Link>
            </div>
          </div>
        </section>

        {/* Herb tray: the kitchen herbs going round on a belt */}
        <section className="section tray-section" aria-label="Herb tray">
          <div className="container">
            <Suspense fallback={<div className="tray-placeholder" />}>
              <HerbConveyor
                items={trayItems}
                renderArt={trayArt}
                eyebrow="Herb tray"
                heading="Take a herb off the tray."
                caption="Hover, tap or use the arrow keys to lift a bowl. The ring colour shows how strong the evidence is."
                legend={trayLegend}
                labels={trayLabels}
                autoplay
                interval={3600}
                onAdd={(item) => navigate(`/herbs/${item.id}`)}
                onLink={(to) => navigate(to)}
              />
            </Suspense>
          </div>
        </section>

        <VineDivider />

        {/* Materia medica and the condition library */}
        <section className="section library-section" id="remedies" aria-labelledby="library-title">
          <div className="container">
            <header className="section-head" data-reveal>
              <p className="eyebrow">Materia medica <span lang="hi">· द्रव्यगुण</span></p>
              <h2 id="library-title" className="t-title">Seven herbs anchor the library.</h2>
              <p className="t-lead">
                Choose a plate to see the conditions in its category. Open any condition for preparation,
                prevention and when it needs a doctor.
              </p>
            </header>

            <div data-reveal>
              <HerbPlates selected={shelfItem || doshaItem ? null : bed} onSelect={pickBed} counts={counts} />
            </div>

            {current.part && !shelfItem && !doshaItem && (
              <dl className="monograph" key={current.id} data-category={current.id}>
                <div><dt>Species</dt><dd><em>{current.latin}</em></dd></div>
                <div><dt>Part used</dt><dd>{current.part}</dd></div>
                <div><dt>Studied compounds</dt><dd>{current.compounds}</dd></div>
              </dl>
            )}

            <div className="ledger-wrap" ref={ledgerRef} data-category={bed}>
              <header className="ledger-head-row">
                <div>
                  <h3 className="ledger-heading">{ledgerTitle}</h3>
                  <p className="t-muted">
                    {shelfItem || doshaItem ? (
                      <button type="button" className="text-link" onClick={clearFilter}>
                        Back to {current.label.toLowerCase()}
                      </button>
                    ) : (
                      `${listed.length} ${listed.length === 1 ? 'condition' : 'conditions'} · open one for preparation and safety notes`
                    )}
                  </p>
                </div>
              </header>
              <ConditionLedger
                key={`${bed}-${ingredient}-${dosha}`}
                conditions={listed}
                mode="expand"
                highlight={ingredient}
                onContinue={continueTo}
                continueLabel={user ? 'Open in my remedies' : 'Save it and ask the guide'}
              />
              <p className="compound-note">
                Compounds are those most often studied for each plant. Listing them is not a claim that a remedy will work for you.
              </p>
            </div>
          </div>
        </section>

        {/* The kitchen shelf: every ingredient the library calls for */}
        <section className="section shelf-section" id="shelf" aria-labelledby="shelf-title">
          <div className="container shelf-grid">
            <div className="shelf-intro" data-reveal="left">
              <p className="eyebrow">Ingredients</p>
              <h2 id="shelf-title" className="t-title">Already in an Indian kitchen.</h2>
              <p className="t-lead">
                No exotic powders and no shopping list. Select an ingredient to see every condition it is used for.
              </p>
            </div>
            <div className="shelves" data-reveal="right">
              {shelves.map(shelf => (
                <div key={shelf.id} className="shelf" style={{ '--k': `${shelf.size}px` }}>
                  <p className="shelf-label">{shelf.label}</p>
                  <ul className="shelf-items">
                    {shelf.items.map((item, i) => (
                      <li key={item.id} style={{ '--i': i }}>
                        <button
                          type="button"
                          className="jar"
                          aria-pressed={ingredient === item.id}
                          onClick={() => pickIngredient(item.id)}
                        >
                          <ClayBowl spice={item.fill} size={shelf.size} />
                          <span className="jar-name">{item.name}</span>
                          <span className="jar-hi" lang="hi">{item.hindi}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The three doshas, explained plainly */}
        <section className="section dosha-section" aria-labelledby="dosha-title">
          <div className="container">
            <header className="section-head section-head-center" data-reveal>
              <p className="eyebrow">Tridosha</p>
              <h2 id="dosha-title" className="t-title">Three functional principles.</h2>
              <p className="t-lead">
                Ayurveda describes the body through three doshas. Each condition in the library records which ones it disturbs.
              </p>
            </header>
            <div className="dosha-grid">
              {doshas.map((d, i) => (
                <article key={d.id} className={`dosha-card dosha-${d.id}`} data-reveal style={{ '--d': i }}>
                  <span className="dosha-orb" aria-hidden="true">
                    <Icon name={d.icon} size={24} strokeWidth={1.6} />
                  </span>
                  <h3 className="dosha-name">{d.name} <span className="hi" lang="hi">{d.hindi}</span></h3>
                  <p className="dosha-elements">{d.elements}</p>
                  <p className="dosha-text">{d.governs}</p>
                  <p className="dosha-text dosha-signs">{d.signs}</p>
                  <button type="button" className="btn btn-ghost btn-sm dosha-btn" onClick={() => pickDosha(d.id)}>
                    {doshaCount(d.id)} linked conditions
                    <Icon name="arrowRight" size={16} className="btn-arrow" />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Honest close */}
        <section className="closing" aria-labelledby="closing-title">
          <Mandala size={720} color="#B08D57" className="closing-mandala" />
          <div className="container closing-grid">
            <div className="closing-plate" aria-hidden="true" data-reveal>
              <BotanicalPlate herb="tulsi" size={200} />
            </div>
            <div className="closing-body" data-reveal>
              <p className="eyebrow closing-eyebrow">Our position</p>
              <h2 id="closing-title" className="t-title">A kitchen remedy is a first step, not a prescription.</h2>
              <p className="t-lead">
                Every entry states how long a condition usually lasts and when it is time to see a doctor.
                Create a free account to save the remedies your family relies on and ask Vanya what the page doesn't answer.
                You can delete the account, and everything saved to it, whenever you like.
              </p>
              <div className="closing-actions">
                <button className="btn btn-leaf btn-lg" onClick={continueTo}>
                  {user ? 'Open your remedies' : 'Create a free account'}
                  <Icon name="arrowRight" size={18} className="btn-arrow" />
                </button>
                {!user && <Link to="/login" className="btn btn-ghost btn-lg closing-ghost">Log in</Link>}
              </div>
            </div>
          </div>
        </section>
      </main>

    </div>
  )
}
