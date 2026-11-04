import React from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Icon'
import '../styles/SitePages.css'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <Link to="/" className="site-footer-brand" aria-label="Natural Healer home">
          <Logo size={28} />
          <span>Natural Healer</span>
        </Link>
        <p className="site-footer-note">General wellness information, not medical advice. For urgent symptoms, seek medical care.</p>
        <nav className="site-footer-links" aria-label="Footer">
          <Link to="/remedies">Materia medica</Link>
          <Link to="/herbs">Herbs</Link>
          <Link to="/ingredients">Ingredients</Link>
          <Link to="/dataset">Dataset</Link>
          <Link to="/about">About</Link>
          <Link to="/safety">Safety</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
        <span className="site-footer-credit">Made by #AbdullahSlash</span>
      </div>
    </footer>
  )
}
