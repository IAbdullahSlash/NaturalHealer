import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from './Navbar'
import Icon from './Icon'
import BotanicalPlate from './Botanicals'
import { herbs, herbById } from '../data/knowledge/herbs'
import enrichment from '../data/knowledge/enrichment'
import compounds from '../data/knowledge/compounds'
import { CAUTION_GROUPS, DRUG_CLASSES, EVIDENCE_LEVELS, GLOSSARY } from '../data/knowledge/vocabulary'
import { shelfInUse } from '../data/kitchen'
import { diseases } from '../data/diseases'
import '../styles/SitePages.css'
import '../styles/Knowledge.css'

// Herbs with a hand-drawn botanical plate
const PLATES = new Set(['tulsi', 'saunf', 'brahmi', 'haldi', 'adrak', 'neem'])

const KIND_LABEL = { herb: 'Herb', spice: 'Spice', food: 'Food', formulation: 'Classical formulation' }

const LANGUAGE = { hi: 'Hindi', sa: 'Sanskrit', mr: 'Marathi', bn: 'Bengali', gu: 'Gujarati', pa: 'Punjabi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', ur: 'Urdu' }

// Names and botany from openly licensed sources (Wikidata CC0, Kew WCVP CC BY 4.0)
function NamesAndBotany({ id }) {
  const e = enrichment.herbs[id]
  if (!e) return null
  const labels = Object.entries(e.wikidata?.labels || {}).filter(([lang]) => LANGUAGE[lang])
  const b = e.botanical
  return (
    <section className="kb-section">
      <h2>Names and botany</h2>
      {labels.length > 0 && (
        <ul className="kb-langs">
          {labels.map(([lang, label]) => <li key={lang}><span>{LANGUAGE[lang]}</span><strong lang={lang}>{label}</strong></li>)}
        </ul>
      )}
      {b && (
        <dl className="kb-amount">
          <div><dt>Accepted name</dt><dd><em>{b.acceptedWithAuthor}</em></dd></div>
          {b.family && <div><dt>Family</dt><dd>{b.family}</dd></div>}
          {b.synonyms.length > 0 && <div><dt>Older names</dt><dd className="kb-synonyms">{b.synonyms.slice(0, 6).map(n => <em key={n}>{n}</em>)}</dd></div>}
        </dl>
      )}
      <p className="kb-note">
        Names from {e.wikidata ? <a href={`https://www.wikidata.org/wiki/${e.wikidata.qid}`} target="_blank" rel="noreferrer">Wikidata</a> : 'Wikidata'} (CC0)
        {b && <>; botany from <a href={`https://www.gbif.org/species/${b.gbifKey}`} target="_blank" rel="noreferrer">the World Checklist of Vascular Plants, Royal Botanic Gardens, Kew</a> (CC BY 4.0)</>}.
      </p>
    </section>
  )
}

// Plant chemistry from Dr. Duke's databases (USDA, CC0): background, not evidence
function Compounds({ id }) {
  const c = compounds.herbs[id]
  if (!c) return null
  const parts = c.parts.slice(0, 3).map(p => (p.part === 'Plant' ? 'whole plant' : p.part.toLowerCase()))
  const partList = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
  return (
    <section className="kb-section">
      <h2>Plant chemistry</h2>
      <p>Researchers have recorded {c.compoundCount} compounds in this plant{partList && <>, most often in the {partList}</>}. Those found in the largest amounts include:</p>
      <ul className="kb-compounds">{c.highestAmounts.map(x => <li key={x.name}>{x.name}</li>)}</ul>
      <p className="kb-note">
        Finding a compound in a plant does not show that a home remedy works or is safe. From <a href={compounds.source} target="_blank" rel="noreferrer">Dr. Duke's Phytochemical and Ethnobotanical Databases</a>, U.S. Department of Agriculture (public domain, CC0), last updated 2016.
      </p>
    </section>
  )
}

function DraftNotice({ many = false }) {
  return (
    <p className="kb-draft">
      <Icon name="info" size={18} />
      <span>
        <strong>{many ? 'These entries are drafts.' : 'Draft entry.'}</strong>{' '}
        {many ? 'They have' : 'It has'} not yet been reviewed by a qualified Ayurvedic practitioner. Check with a practitioner or doctor before using {many ? 'them' : 'it'} as advice.
      </span>
    </p>
  )
}

const withMeaning = (word) => (
  <span key={word} className="kb-term">{word}{GLOSSARY[word] && <span className="kb-term-meaning"> {GLOSSARY[word]}</span>}</span>
)

function HerbIndex() {
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return herbs
    return herbs.filter(h => [h.name, h.hindi, h.sanskrit, h.english, h.latin, ...h.traditionalUses].join(' ').toLowerCase().includes(q))
  }, [query])

  return (
    <>
      <header className="site-page-intro">
        <p className="eyebrow">Knowledge base</p>
        <h1 className="t-title">Herbs and kitchen substances.</h1>
        <p className="t-lead">
          {herbs.length} entries with classical properties, traditional uses, safe amounts, cautions, medicine interactions and an honest rating of the evidence. Vanya answers from these entries and cites them.
        </p>
      </header>
      <DraftNotice many />
      <label className="library-search kb-search">
        <span className="visually-hidden">Search herbs</span>
        <Icon name="search" size={19} />
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by any name or use, like haldi, Withania or sleep" />
      </label>
      <p className="library-count" aria-live="polite">{shown.length} {shown.length === 1 ? 'entry' : 'entries'}</p>
      <ul className="kb-grid">
        {shown.map(h => (
          <li key={h.id}>
            <Link to={`/herbs/${h.id}`} className="kb-card">
              <span className="kb-card-kind">{KIND_LABEL[h.kind]} · {h.part}</span>
              <span className="kb-card-name">{h.name} <span className="hi" lang="hi">{h.hindi}</span></span>
              <span className="kb-card-latin">{h.latin || h.english}</span>
              <span className="kb-card-meta">
                <span className={`kb-evidence kb-evidence-${h.evidence.level}`}>{EVIDENCE_LEVELS[h.evidence.level].label}</span>
                {h.interactions.length > 0 && <span className="kb-flag">{h.interactions.length} interaction{h.interactions.length > 1 ? 's' : ''}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function HerbDetail({ herb, user, onOpenAIChat }) {
  const p = herb.properties || {}
  const usedIn = (shelfInUse.find(i => i.id === herb.id)?.conditions || [])
    .map(id => diseases.find(d => d.id === id)).filter(Boolean)
  const ev = EVIDENCE_LEVELS[herb.evidence.level]

  return (
    <article className="kb-detail">
      <p className="site-breadcrumb"><Link to="/herbs">Herbs</Link><span>/</span>{herb.name}</p>

      <div className="kb-head">
        <header className="site-page-intro">
          <p className="eyebrow">{KIND_LABEL[herb.kind]} · {herb.part}</p>
          <h1 className="t-title">{herb.name} <span className="hi" lang="hi">{herb.hindi}</span></h1>
          <p className="t-lead kb-names">
            {herb.english}
            {herb.latin && <> · <em>{herb.latin}</em></>}
            {herb.sanskrit && <> · Sanskrit: {herb.sanskrit}</>}
          </p>
        </header>
        {PLATES.has(herb.id) && <div className="kb-plate" aria-hidden="true"><BotanicalPlate herb={herb.id} size={150} drawn /></div>}
      </div>

      <DraftNotice />

      <section className="kb-section">
        <h2>Classical properties</h2>
        <dl className="kb-props">
          <div><dt>Rasa <span>taste</span></dt><dd>{p.rasa?.length ? p.rasa.map(withMeaning) : <span className="kb-missing">Not recorded</span>}</dd></div>
          <div><dt>Guna <span>qualities</span></dt><dd>{p.guna?.length ? p.guna.map(withMeaning) : <span className="kb-missing">Not recorded</span>}</dd></div>
          <div><dt>Virya <span>potency</span></dt><dd>{p.virya ? withMeaning(p.virya) : <span className="kb-missing">Not recorded</span>}</dd></div>
          <div><dt>Vipaka <span>after digestion</span></dt><dd>{p.vipaka ? withMeaning(p.vipaka) : <span className="kb-missing">Not recorded</span>}</dd></div>
          <div><dt>Doshas</dt><dd>
            {p.pacifies?.length ? <>Pacifies {p.pacifies.join(', ')}</> : <span className="kb-missing">Not recorded</span>}
            {p.aggravates?.length > 0 && <><br />Can aggravate {p.aggravates.join(', ')}</>}
          </dd></div>
        </dl>
      </section>

      <NamesAndBotany id={herb.id} />

      <div className="kb-two">
        <section className="kb-section">
          <h2>Actions</h2>
          <ul className="kb-list">{herb.actions.map(a => <li key={a}>{a}</li>)}</ul>
        </section>
        <section className="kb-section">
          <h2>Traditional uses</h2>
          <ul className="kb-list">{herb.traditionalUses.map(a => <li key={a}>{a}</li>)}</ul>
        </section>
      </div>

      <section className="kb-section">
        <h2>Using it at home</h2>
        <p>{herb.kitchenUse}</p>
        <dl className="kb-amount">
          <div><dt>Forms</dt><dd>{herb.typicalUse.forms.join(', ')}</dd></div>
          <div><dt>Typical adult amount</dt><dd>{herb.typicalUse.adultAmount}</dd></div>
        </dl>
        {herb.typicalUse.note && <p className="kb-note">{herb.typicalUse.note}</p>}
      </section>

      <section className="kb-section kb-safety" aria-labelledby="kb-safety-title">
        <h2 id="kb-safety-title">Safety</h2>
        {herb.cautions.length > 0 ? (
          <ul className="kb-cautions">
            {herb.cautions.map(c => <li key={c.group}><strong>{CAUTION_GROUPS[c.group]}</strong><span>{c.note}</span></li>)}
          </ul>
        ) : <p>No specific cautions recorded beyond normal food use.</p>}

        <h3>Medicine interactions</h3>
        {herb.interactions.length > 0 ? (
          <ul className="kb-cautions">
            {herb.interactions.map(i => (
              <li key={i.drugClass} className={i.level === 'avoid' ? 'is-avoid' : undefined}>
                <strong>{DRUG_CLASSES[i.drugClass]}</strong>
                <span><em className="kb-level">{i.level === 'avoid' ? 'Avoid together' : 'Use with caution'}</em> {i.effect}</span>
              </li>
            ))}
          </ul>
        ) : <p>No medicine interactions recorded. Always tell your doctor about anything you take.</p>}
      </section>

      <section className="kb-section">
        <h2>Evidence</h2>
        <p><span className={`kb-evidence kb-evidence-${herb.evidence.level}`}>{ev.label}</span> <span className="kb-note">{ev.note}</span></p>
        <p>{herb.evidence.summary}</p>
        <a className="site-inline-link" href={herb.evidence.pubmedQuery} target="_blank" rel="noreferrer">Search the research on PubMed <Icon name="arrowRight" size={16} /></a>
      </section>

      <Compounds id={herb.id} />

      {usedIn.length > 0 && (
        <section className="kb-section">
          <h2>In the remedy library</h2>
          <ul className="ingredient-condition-links">
            {usedIn.map(d => <li key={d.id}><Link to={`/conditions/${d.id}`}>{d.title}<Icon name="arrowRight" size={15} /></Link></li>)}
          </ul>
        </section>
      )}

      <section className="kb-section">
        <h2>Sources</h2>
        <ul className="kb-sources">
          {herb.sources.map(s => (
            <li key={`${s.title}${s.detail || ''}`}>
              {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
              {s.detail ? ` (${s.detail})` : ''}
            </li>
          ))}
        </ul>
        <p className="kb-note">Sources are named at the level we are sure of. Exact passages will be added when the entry is reviewed.</p>
      </section>

      <div className="site-page-actions">
        {user
          ? <button className="btn btn-leaf" onClick={onOpenAIChat}><Icon name="sparkle" size={16} /> Ask Vanya about {herb.name}</button>
          : <Link className="btn btn-leaf" to="/signup">Create an account to ask Vanya <Icon name="arrowRight" size={17} /></Link>}
        <Link className="btn btn-paper" to="/herbs">All herbs</Link>
      </div>
    </article>
  )
}

export default function HerbPages({ user, onLogout, onOpenAIChat }) {
  const { herbId } = useParams()
  const herb = herbId ? herbById[herbId] : null

  useEffect(() => {
    document.title = `${herb ? `${herb.name} (${herb.english})` : herbId ? 'Herb not found' : 'Herbs'} | Natural Healer`
  }, [herb, herbId])

  let content
  if (!herbId) content = <HerbIndex />
  else if (herb) content = <HerbDetail herb={herb} user={user} onOpenAIChat={onOpenAIChat} />
  else content = (
    <>
      <header className="site-page-intro"><p className="eyebrow">Herb not found</p><h1 className="t-title">That entry isn't in the knowledge base yet.</h1></header>
      <Link className="btn btn-leaf" to="/herbs">Browse all herbs <Icon name="arrowRight" size={17} /></Link>
    </>
  )

  return (
    <div className="site-page-shell">
      <Navbar user={user} onLogout={onLogout} onOpenAIChat={onOpenAIChat} />
      <main id="main-content" tabIndex={-1} className="container site-page-main">{content}</main>
    </div>
  )
}
