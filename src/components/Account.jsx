import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import Icon from './Icon'
import { deleteAccount, usesPassword } from '../services/authService'
import '../styles/SitePages.css'

// What deleting an account removes; kept in step with deleteUserData on the server
const erased = [
  'Your profile and display name',
  'Saved conditions',
  'Your prakriti answers and result',
  'Every conversation with Vanya',
  'Safety notes recorded from your conversations',
  'Your sign-in, so this email can sign up again as a new account',
]

export default function Account({ user, onLogout, onOpenAIChat, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const needsPassword = usesPassword()

  useEffect(() => { document.title = 'Account | Natural Healer' }, [])

  const confirmed = typed.trim() === 'DELETE' && (!needsPassword || password.length > 0)

  const handleDelete = async (e) => {
    e.preventDefault()
    if (!confirmed || busy) return
    setBusy(true)
    setError('')
    const result = await deleteAccount(password)
    if (result.success) return onDeleted()
    setError(result.error)
    setBusy(false)
  }

  const cancel = () => {
    setOpen(false)
    setTyped('')
    setPassword('')
    setError('')
  }

  return (
    <div className="site-page-shell">
      <Navbar user={user} onLogout={onLogout} onOpenAIChat={onOpenAIChat} />
      <main id="main-content" tabIndex={-1} className="container site-page-main">
        <header className="site-page-intro">
          <p className="eyebrow">Your account</p>
          <h1 className="t-title">Account</h1>
          <p className="t-lead">The details you sign in with, and the option to delete everything saved here.</p>
        </header>

        <dl className="account-details">
          <div><dt>Name</dt><dd>{user.displayName}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Signs in with</dt><dd>{needsPassword ? 'Email and password' : 'Google'}</dd></div>
        </dl>

        <section className="account-danger" aria-labelledby="delete-title">
          <h2 id="delete-title">Delete your account</h2>
          <p>This permanently removes:</p>
          <ul>{erased.map(item => <li key={item}>{item}</li>)}</ul>
          <p>It can't be undone, and deleted chats can't be recovered. To keep a conversation, copy it before you continue.</p>

          {!open ? (
            <button type="button" className="btn account-delete-btn" onClick={() => setOpen(true)}>Delete account</button>
          ) : (
            <form className="account-confirm" onSubmit={handleDelete} noValidate>
              <div className="field">
                <label htmlFor="confirm-delete" className="field-label">Type DELETE to confirm</label>
                <input id="confirm-delete" className="field-input" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy} autoFocus />
              </div>
              {needsPassword ? (
                <div className="field">
                  <label htmlFor="confirm-password" className="field-label">Your password</label>
                  <input id="confirm-password" type="password" className="field-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" disabled={busy} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? 'delete-error' : undefined} />
                </div>
              ) : (
                <p className="field-hint">Google will ask you to choose your account once more to confirm it's you.</p>
              )}
              {error && <p id="delete-error" className="field-error" role="alert">{error}</p>}
              <div className="account-confirm-actions">
                <button type="submit" className="btn account-delete-btn" disabled={!confirmed || busy}>{busy ? 'Deleting…' : 'Delete my account permanently'}</button>
                <button type="button" className="btn btn-paper" onClick={cancel} disabled={busy}>Cancel</button>
              </div>
            </form>
          )}
        </section>

        <p className="site-updated">How your data is handled is described in the <Link to="/privacy">privacy notice</Link>.</p>
      </main>
    </div>
  )
}
