import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon, { Logo } from './Icon'
import '../styles/Navbar.css'

export default function Navbar({ user, onLogout, onOpenAIChat, overHero = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  // 'open' | 'closing' | 'closed': the sheet stays mounted briefly to leave the way it came
  const [sheetState, setSheetState] = useState('closed')
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const isAuthenticated = !!user

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu whenever the route changes
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash])

  useEffect(() => {
    if (menuOpen) {
      setSheetState('open')
      return
    }
    setSheetState(state => (state === 'closed' ? 'closed' : 'closing'))
    const timer = setTimeout(() => setSheetState('closed'), 150)
    return () => clearTimeout(timer)
  }, [menuOpen])

  const initial = user?.displayName?.charAt(0).toUpperCase() || 'U'

  const links = isAuthenticated
    ? [{ to: '/home', label: 'My remedies' }, { to: '/remedies', label: 'Materia medica' }, { to: '/herbs', label: 'Herbs' }, { to: '/prakriti', label: 'Prakriti' }]
    : [{ to: '/remedies', label: 'Materia medica' }, { to: '/herbs', label: 'Herbs' }, { to: '/ingredients', label: 'Ingredients' }, { to: '/safety', label: 'Safety' }]

  const isCurrent = (to) => to === location.pathname

  return (
    <nav className={`navbar ${scrolled ? 'is-scrolled' : ''} ${overHero ? 'is-over-hero' : ''}`} aria-label="Main">
      <div className="container navbar-inner">
        <Link to={isAuthenticated ? '/home' : '/'} className="navbar-brand">
          <Logo size={30} />
          <span className="navbar-wordmark">Natural Healer</span>
        </Link>

        <div className="navbar-links">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="navbar-link"
              aria-current={isCurrent(link.to) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <button className="btn btn-leaf btn-sm navbar-ask" onClick={onOpenAIChat} aria-label="Ask the AI guide">
                <Icon name="sparkle" size={16} />
                <span className="navbar-ask-label">Ask Vanya</span>
              </button>
              <div className="navbar-user">
                <Link to="/account" className="navbar-account" title="Account">
                  <span className="navbar-avatar" aria-hidden="true">{initial}</span>
                  <span className="navbar-user-name">{user.displayName}</span>
                </Link>
                <button
                  className="icon-btn navbar-hide-mobile"
                  onClick={onLogout}
                  aria-label="Log out"
                  title="Log out"
                >
                  <Icon name="logout" size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link navbar-hide-mobile">Log in</Link>
              <Link to="/signup" className="btn btn-leaf btn-sm">Get started</Link>
            </>
          )}
          <button
            className="icon-btn navbar-menu-btn"
            onClick={() => setMenuOpen(open => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} />
          </button>
        </div>
      </div>

      {sheetState !== 'closed' && (
        <div className="navbar-sheet" data-state={sheetState}>
          {links.map(link => (
            <Link key={link.to} to={link.to} className="navbar-link">{link.label}</Link>
          ))}
          {isAuthenticated && <Link to="/account" className="navbar-link">Account</Link>}
          {isAuthenticated ? (
            <button className="btn btn-paper" onClick={onLogout}>
              <Icon name="logout" size={18} />
              Log out
            </button>
          ) : (
            <Link to="/login" className="btn btn-paper">Log in</Link>
          )}
        </div>
      )}
    </nav>
  )
}
