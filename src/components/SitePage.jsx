import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Navbar from './Navbar'
import Icon from './Icon'
import { diseases } from '../data/diseases'
import { bedFor, beds, ingredientsFor, shelfInUse } from '../data/kitchen'
import { severityLabels, ShelfTags } from './ConditionLedger'
import { herbById } from '../data/knowledge/herbs'
import { conditionCodes, ICD11_BROWSER, ICD11_RELEASE } from '../data/knowledge/conditionCodes'

// WHO ICD-11 codes: the closest standard match, shown for clinicians and records
function ConditionCodes({ id }) {
  const c = conditionCodes[id]
  if (!c) return null
  return (
    <p className="condition-codes">
      <span className="condition-codes-label">Classification</span>
      <span>ICD-11 <strong>{c.icd11.code}</strong> {c.icd11.title}</span>
      {c.tm2Group && <span>Ayurveda (ICD-11 TM2): {c.tm2Group.title}, {c.tm2Group.range}</span>}
      {c.icd11.note && <span className="condition-codes-note">{c.icd11.note}</span>}
      <a href={ICD11_BROWSER} target="_blank" rel="noreferrer">WHO ICD-11 browser, release {ICD11_RELEASE}</a>
    </p>
  )
}
import '../styles/SitePages.css'

const updated = '23 October 2026'

function PageIntro({ eyebrow, title, lead }) {
  return <header className="site-page-intro"><p className="eyebrow">{eyebrow}</p><h1 className="t-title">{title}</h1>{lead && <p className="t-lead">{lead}</p>}</header>
}

function InfoSection({ title, children }) {
  return <section className="site-info-section"><h2>{title}</h2><div>{children}</div></section>
}

function AboutPage() {
  return <>
    <PageIntro eyebrow="About Natural Healer" title="Household knowledge, presented with care." lead="A practical reference for common conditions, familiar ingredients, and the moments when home care is not enough." />
    <div className="site-content-grid">
      <InfoSection title="What you can do here"><p>Browse a small library of conditions and kitchen remedies, read preparation and prevention notes, save entries to your account, and ask Vanya follow-up questions.</p><p>The prakriti questionnaire is a self-assessment. It is optional context for general wellness conversations, not a medical evaluation.</p></InfoSection>
      <InfoSection title="How we approach Ayurveda"><p>We use Ayurvedic terms where they help explain the tradition, alongside familiar ingredient names and botanical identities. A traditional explanation is not proof that a remedy treats a condition.</p><p>We aim to make limits visible and encourage professional care when symptoms are serious or persistent.</p></InfoSection>
      <InfoSection title="A living reference"><p>The library is educational and is not a substitute for a clinician, diagnosis, or prescribed treatment. Content can be incomplete and should be reviewed with a qualified health professional before you act on it.</p><Link className="site-inline-link" to="/safety">Read the safety guide <Icon name="arrowRight" size={16} /></Link></InfoSection>
    </div>
    <div className="site-page-actions"><Link className="btn btn-leaf" to="/remedies">Explore the library <Icon name="arrowRight" size={17} /></Link><Link className="btn btn-paper" to="/signup">Create an account</Link></div>
  </>
}

function SafetyPage() {
  return <>
    <PageIntro eyebrow="Care comes first" title="When to get medical help." lead="Home remedies are for general support. They should never delay urgent care or replace advice from a qualified clinician." />
    <section className="site-emergency" aria-labelledby="emergency-title">
      <span className="site-emergency-mark"><Icon name="alert" size={22} /></span>
      <div><h2 id="emergency-title">If someone may be in immediate danger</h2><p>Call your local emergency number or go to the nearest emergency department. In India, call <a href="tel:112">112</a>. If you are supporting someone with thoughts of suicide or self-harm in India, call Tele-MANAS at <a href="tel:14416">14416</a> for mental health support. If there is immediate danger, call 112.</p><p className="site-source-links">Official information: <a href="https://112.gov.in/" target="_blank" rel="noreferrer">India Emergency Response Support System</a> · <a href="https://telemanas.mohfw.gov.in/" target="_blank" rel="noreferrer">Tele-MANAS, Ministry of Health and Family Welfare</a></p></div>
    </section>
    <div className="site-content-grid">
      <InfoSection title="Seek urgent help for warning signs"><p>Examples include severe chest pain, difficulty breathing, stroke signs, fainting or seizures, a serious allergic reaction, poisoning or overdose, heavy bleeding, a serious head injury, or fever in a very young baby.</p><p>This list is not complete. If a symptom feels severe, sudden, or frightening, get medical help.</p></InfoSection>
      <InfoSection title="Check with a clinician before trying a remedy"><p>Ask a qualified clinician or pharmacist first if you are pregnant or breastfeeding, caring for a child, taking prescription medicine, or managing a long-term condition.</p><p>Do not stop or change prescribed medicine because of something on this site or an AI response.</p></InfoSection>
      <InfoSection title="About Vanya"><p>Vanya is an AI guide. It can misunderstand a question, miss important context, or give incomplete information. It does not diagnose and cannot assess an emergency.</p><p>For symptoms that persist, worsen, or return, arrange a clinical assessment even if a remedy seems to help.</p></InfoSection>
    </div>
    <p className="site-updated">Reviewed {updated}. Emergency contacts and guidance can change; use official local services.</p>
  </>
}

function PrivacyPage() {
  return <>
    <PageIntro eyebrow="Privacy" title="What the site stores and shares." lead="This page describes the data flows implemented in Natural Healer today, in plain language." />
    <div className="site-legal-note"><Icon name="info" size={18} /><p>Last updated {updated}. This is a product privacy notice, not a complete legal review. Please do not share information you would not want stored in your account or processed to generate an AI response.</p></div>
    <div className="site-content-grid">
      <InfoSection title="Account and saved data"><p>Firebase Authentication handles sign-in. The app stores account profile details, saved conditions, prakriti answers and result, and chat titles and messages in the project’s Firestore database.</p><p>You can delete your account from the <Link to="/account">Account page</Link>. That permanently removes your profile, saved conditions, prakriti result, every chat, the safety notes recorded from your chats, and your sign-in.</p></InfoSection>
      <InfoSection title="AI conversations"><p>When you send a question, the message and relevant conversation history are sent to Google Gemini to generate a response. A saved chat is stored in your account. Avoid including names, contact details, or other identifying information in health questions.</p></InfoSection>
      <InfoSection title="Safety events and operations"><p>If a safety warning is triggered, the app logs its category and triage level so the service can record that triage occurred; it does not include the message text in that safety event. The service also uses rate-limit counters to protect the API.</p></InfoSection>
      <InfoSection title="Your choices"><p>You can delete individual chats from your chat history, or delete your whole account from the Account page. Signing out ends the current session on this device. Authentication and AI processing are provided by Firebase and Google; their own privacy terms also apply.</p></InfoSection>
    </div>
  </>
}

// The public dataset (files built by scripts/data/export.mjs, served at /data/)
const kb = __KB_STATS__
const DATA_FILES = [
  { path: 'datapackage.json', title: 'Data package descriptor', note: 'Column definitions, licences and sources (Frictionless Data Package)' },
  { path: 'herbs.csv', title: 'Herbs', note: 'One row per herb, spice or food' },
  { path: 'herb-cautions.csv', title: 'Cautions', note: 'Who should take care with each herb, and why' },
  { path: 'herb-interactions.csv', title: 'Medicine interactions', note: 'Medicine classes each herb interacts with' },
  { path: 'conditions.csv', title: 'Conditions', note: 'Severity, duration, ICD-11 code and when to see a doctor' },
  { path: 'remedies.csv', title: 'Remedies', note: 'Home remedies for each condition' },
  { path: 'botany.csv', title: 'Botany', note: "Kew-accepted names and synonyms (CC BY 4.0, Royal Botanic Gardens, Kew)" },
  { path: 'regional-names.csv', title: 'Regional names', note: 'Names in Indian languages (Wikidata, CC0)' },
  { path: 'plant-chemistry.json', title: 'Plant chemistry', note: "Recorded compounds (Dr. Duke's databases, USDA, CC0)" },
  { path: 'herbs.json', title: 'Herbs, complete', note: 'Every field, as JSON' },
  { path: 'conditions.json', title: 'Conditions, complete', note: 'Every field, as JSON' },
  { path: 'README.md', title: 'Read me', note: 'Contents, licences and limits' },
]

function DatasetPage() {
  return <>
    <PageIntro eyebrow="Open dataset" title="The knowledge base, as data." lead={`Everything Vanya answers from, as CSV and JSON files: ${kb.herbs} herb entries, ${kb.conditions} conditions, ${kb.remedies} remedies, ${kb.cautions} cautions and ${kb.interactions} medicine interactions.`} />
    <div className="site-legal-note"><Icon name="info" size={18} /><p>{kb.reviewed === 0 ? 'Every entry is a draft' : `${kb.herbs - kb.reviewed} entries are drafts`} until a qualified Ayurvedic practitioner reviews it; each row's review_status says which. This is educational information, not medical advice. Do not use it to diagnose or treat anyone.</p></div>
    <section className="condition-section"><h2>Download</h2>
      <ul className="dataset-files">{DATA_FILES.map(f => <li key={f.path}><a href={`/data/${f.path}`} download={f.path.endsWith('.json') && f.path !== 'datapackage.json' ? f.path : undefined}>{f.path}</a><span><strong>{f.title}.</strong> {f.note}</span></li>)}</ul>
    </section>
    <div className="site-content-grid">
      <InfoSection title="How it is built"><p>Each herb and condition is one JSON file, checked against a published schema before every build. Botanical names come from Kew's World Checklist, regional names from Wikidata, and plant chemistry from the USDA's Dr. Duke databases, merged by script.</p><p>The schemas are at <a className="site-inline-link" href="/data/schema/herb.schema.json">herb.schema.json</a> and <a className="site-inline-link" href="/data/schema/condition.schema.json">condition.schema.json</a>.</p></InfoSection>
      <InfoSection title="Licences"><p>Natural Healer's own entries are shared under the Creative Commons Attribution 4.0 licence: you may reuse them if you credit Natural Healer. Merged data keeps its source's licence: Kew's checklist is CC BY 4.0; Wikidata and the Duke databases are public domain (CC0).</p><p>ICD-11 codes belong to the World Health Organization and are included as references only.</p></InfoSection>
    </div>
    <p className="site-updated">Rebuilt with every update to the site. See the <Link to="/herbs">herb pages</Link> for the same content in readable form.</p>
  </>
}

function TermsPage() {
  return <>
    <PageIntro eyebrow="Terms of use" title="Use this reference with care." lead="These plain-language terms explain the intended use and limits of Natural Healer." />
    <div className="site-legal-note"><Icon name="info" size={18} /><p>Last updated {updated}. These terms are a starting point and should receive legal review before the site is offered publicly.</p></div>
    <div className="site-content-grid">
      <InfoSection title="Educational information only"><p>Natural Healer provides general wellness and educational information. It does not provide medical advice, diagnosis, or treatment, and it does not replace a qualified healthcare professional.</p><p>Use the site at your own discretion. Seek professional help for medical concerns and urgent care for emergencies.</p></InfoSection>
      <InfoSection title="AI guide"><p>Vanya generates responses using artificial intelligence. Responses may be inaccurate, incomplete, or unsuitable for your circumstances. Do not rely on them to make urgent or treatment decisions, and do not stop prescribed care based on an AI response.</p></InfoSection>
      <InfoSection title="Accounts and availability"><p>You are responsible for keeping access to your account secure and for the information you choose to submit. We may update, suspend, or discontinue parts of the service as the project changes. Chat and profile features require a working account and connected services.</p></InfoSection>
      <InfoSection title="Respectful use"><p>Do not use the site to interfere with the service, probe its security, or submit content that is unlawful or intended to harm others. The site and its original design and code are provided under their applicable licenses.</p></InfoSection>
    </div>
  </>
}

function LibraryPage() {
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const results = useMemo(() => diseases.filter(disease => {
    const matchesCategory = category === 'all' || disease.category === category
    const text = `${disease.title} ${disease.desc} ${disease.remedies.join(' ')} ${ingredientsFor(disease).map(item => `${item.name} ${item.english || ''}`).join(' ')}`.toLowerCase()
    return matchesCategory && text.includes(query.trim().toLowerCase())
  }), [category, query])
  return <>
    <PageIntro eyebrow="Materia medica" title="Find a condition or remedy." lead="Browse the reference by topic, or search for a familiar ingredient. Open an entry for the full notes and safety context." />
    <div className="library-controls">
      <label className="library-search"><span className="visually-hidden">Search conditions and ingredients</span><Icon name="search" size={19} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search conditions, remedies, ingredients" /></label>
      <div className="library-filters" role="group" aria-label="Filter by category">{beds.map(bed => <button key={bed.id} type="button" className={category === bed.id ? 'is-selected' : ''} aria-pressed={category === bed.id} onClick={() => setCategory(bed.id)}>{bed.label}</button>)}</div>
    </div>
    <p className="library-count" aria-live="polite">{results.length} {results.length === 1 ? 'entry' : 'entries'}</p>
    {results.length ? <ul className="library-results">{results.map(disease => {
      const bed = bedFor(disease.category)
      return <li key={disease.id} data-category={disease.category}><article><p className="eyebrow">{bed.label} · {severityLabels[disease.severity]}</p><h2>{disease.title}</h2><p>{disease.desc}</p><ShelfTags disease={disease} /><div className="library-card-meta"><span>Usually {disease.duration}</span><span>{disease.remedies.length} {disease.remedies.length === 1 ? 'remedy' : 'remedies'}</span></div><Link className="site-inline-link" to={`/conditions/${disease.id}`}>Open condition page <Icon name="arrowRight" size={16} /></Link></article></li>
    })}</ul> : <div className="library-empty"><h2>No entries match that search.</h2><p>Try a broader term or clear the category filter.</p><button type="button" className="btn btn-paper" onClick={() => { setCategory('all'); setQuery('') }}>Show all conditions</button></div>}
  </>
}

function IngredientsPage() {
  return <>
    <PageIntro eyebrow="Kitchen shelf" title="Ingredients already close at hand." lead="See which conditions in the library mention each ingredient. Their presence in a remedy is not evidence that the remedy is effective or right for you." />
    <ul className="ingredient-directory">{shelfInUse.map(item => <li key={item.id}><article><div className="ingredient-directory-head"><span className="ingredient-initial" aria-hidden="true">{item.name.slice(0, 1)}</span><div><h2>{herbById[item.id] ? <Link to={`/herbs/${item.id}`}>{item.name}</Link> : item.name}</h2>{item.english && <p>{item.english}</p>}</div><span className="hi" lang="hi">{item.hindi}</span></div><p className="ingredient-used">Mentioned in {item.conditions.length} {item.conditions.length === 1 ? 'condition' : 'conditions'}</p><ul className="ingredient-condition-links">{item.conditions.map(id => { const disease = diseases.find(entry => entry.id === id); return disease && <li key={id}><Link to={`/conditions/${id}`}>{disease.title}<Icon name="arrowRight" size={15} /></Link></li> })}</ul></article></li>)}</ul>
    <p className="site-legal-note"><Icon name="info" size={18} /><span>Ingredient names are matched from the current reference library. Ask a qualified clinician or pharmacist about interactions, allergies, pregnancy, and use with medicines.</span></p>
  </>
}

function ConditionPage({ user, onOpenAIChat }) {
  const { conditionId } = useParams()
  const disease = diseases.find(item => item.id === conditionId)
  if (!disease) return <><PageIntro eyebrow="Condition not found" title="We couldn't find that entry." lead="It may have moved or the link may be incomplete." /><Link className="btn btn-leaf" to="/remedies">Browse all conditions <Icon name="arrowRight" size={17} /></Link></>
  const bed = bedFor(disease.category)
  return <>
    <p className="site-breadcrumb"><Link to="/remedies">Materia medica</Link><span>/</span>{bed.label}</p>
    <PageIntro eyebrow={`${bed.label} · ${bed.herbName}`} title={disease.title} lead={disease.desc} />
    <dl className="condition-facts"><div><dt>Typical duration</dt><dd>{disease.duration}</dd></div><div><dt>Severity</dt><dd>{severityLabels[disease.severity]}</dd></div><div><dt>Dosha noted in library</dt><dd>{disease.doshas.join(', ')}</dd></div></dl>
    <ConditionCodes id={disease.id} />
    {disease.severity === 'serious' && <div className="site-emergency condition-warning"><Icon name="alert" size={22} /><p><strong>This condition needs medical care.</strong> Use general wellness measures only alongside professional treatment, never instead of it. <Link to="/safety">Read the safety guide</Link>.</p></div>}
    <section className="condition-section"><h2>From your kitchen shelf</h2><ShelfTags disease={disease} limit={20} /></section>
    <section className="condition-section"><h2>Remedies and supportive habits</h2><ol className="condition-remedies">{disease.remedies.map((remedy, index) => <li key={remedy}><span>{String(index + 1).padStart(2, '0')}</span><p>{remedy}</p></li>)}</ol></section>
    <section className="condition-section"><h2>Prevention and daily care</h2><ul className="condition-prevention">{disease.prevention.map(tip => <li key={tip}><Icon name="check" size={16} /><span>{tip}</span></li>)}</ul></section>
    {disease.seeDoctor?.length > 0 && <section className="condition-section condition-doctor"><h2>When to see a doctor</h2><ul>{disease.seeDoctor.map(sign => <li key={sign}><Icon name="alert" size={16} /><span>{sign}</span></li>)}</ul></section>}
    <p className="site-legal-note"><Icon name="info" size={18} /><span>Educational information, not medical advice. Check with a qualified clinician before starting a remedy, especially if pregnant, breastfeeding, caring for a child, or taking medicine. Ingredient information does not prove a remedy is effective.</span></p>
    <div className="site-page-actions">{user ? <button className="btn btn-leaf" onClick={onOpenAIChat}><Icon name="sparkle" size={16} /> Ask Vanya about this</button> : <Link className="btn btn-leaf" to="/signup">Create an account to ask Vanya <Icon name="arrowRight" size={17} /></Link>}<Link className="btn btn-paper" to="/remedies">Back to the library</Link></div>
    <p className="site-updated">Ingredients shown: {ingredientsFor(disease).map(item => item.name).join(', ') || 'none listed'}.</p>
  </>
}

export default function SitePage({ page, user, onLogout, onOpenAIChat }) {
  const isCondition = !page
  const location = useLocation()
  const titles = { dataset: 'Open dataset', about: 'About', safety: 'Safety guide', privacy: 'Privacy', terms: 'Terms of use', remedies: 'Materia medica', ingredients: 'Ingredients', 'not-found': 'Page not found' }
  useEffect(() => {
    const conditionTitle = isCondition ? diseases.find(item => item.id === window.location.pathname.split('/').pop())?.title : null
    document.title = `${conditionTitle || titles[page] || 'Natural Healer'} | Natural Healer`
  }, [page, isCondition, location.pathname])

  const content = page === 'about' ? <AboutPage />
    : page === 'safety' ? <SafetyPage />
      : page === 'privacy' ? <PrivacyPage />
        : page === 'terms' ? <TermsPage />
          : page === 'dataset' ? <DatasetPage />
          : page === 'remedies' ? <LibraryPage />
            : page === 'ingredients' ? <IngredientsPage />
          : page === 'not-found' ? <><PageIntro eyebrow="404 · Page not found" title="This page isn't in the garden." lead="The address may be old or typed incorrectly. Head back to the library and start again." /><Link className="btn btn-leaf" to="/">Go to the home page <Icon name="arrowRight" size={17} /></Link></>
            : <ConditionPage user={user} onOpenAIChat={onOpenAIChat} />

  return <div className="site-page-shell"><Navbar user={user} onLogout={onLogout} onOpenAIChat={onOpenAIChat} /><main id="main-content" tabIndex={-1} className="container site-page-main">{content}</main></div>
}
