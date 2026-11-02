import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { signOutUser } from './services/authService'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Signup from './components/Signup'
import ForgotPassword from './components/ForgotPassword'
import Homepage from './components/Homepage'
import Prakriti from './components/Prakriti'
import Account from './components/Account'
import FloatingAIChat from './components/FloatingAIChat'
import { VaidyaAvatar } from './components/Vaidya'
import SitePage from './components/SitePage'
import HerbPages from './components/HerbPages'
import SiteFooter from './components/SiteFooter'

function AppRoutes() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'User'
        })
        setIsAuthenticated(true)
      } else {
        // User is signed out
        setUser(null)
        setIsAuthenticated(false)
      }
      setIsLoading(false)
    })

    // Cleanup subscription
    return () => unsubscribe()
  }, [])
  
  const handleLogin = (userData) => {
    // Firebase auth state listener will handle setting user state
    navigate('/home')
  }

  const handleLogout = async () => {
    await signOutUser()
    setIsAIChatOpen(false)
    navigate('/')
  }

  const handleAccountDeleted = () => {
    setIsAIChatOpen(false)
    navigate('/', { replace: true })
  }

  // Public pages render immediately; only the private dashboard waits for the session
  const sessionPending = (
    <div className="auth-loading" role="status">
      <VaidyaAvatar size={72} />
      <p>Preparing your remedies…</p>
    </div>
  )

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <LandingPage
              user={user}
              onLogout={handleLogout}
              onOpenAIChat={() => setIsAIChatOpen(true)}
            />
          }
        />
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <Login 
                onLogin={handleLogin}
                onSwitchToSignup={() => navigate('/signup')}
                onSwitchToForgotPassword={() => navigate('/forgot-password')}
              />
            )
          } 
        />
        <Route 
          path="/signup" 
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <Signup 
                onSignup={handleLogin}
                onSwitchToLogin={() => navigate('/login')}
              />
            )
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            <ForgotPassword 
              onBackToLogin={() => navigate('/login')}
            />
          } 
        />

        {/* Protected Routes */}
        <Route 
          path="/home" 
          element={
            isLoading ? sessionPending : isAuthenticated ? (
              <Homepage user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        <Route
          path="/account"
          element={
            isLoading ? sessionPending : isAuthenticated ? (
              <Account user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} onDeleted={handleAccountDeleted} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/prakriti"
          element={
            isLoading ? sessionPending : isAuthenticated ? (
              <Prakriti user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/conditions/:conditionId" element={<SitePage user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} />} />
        <Route path="/remedies" element={<SitePage user={user} onLogout={handleLogout} page="remedies" />} />
        <Route path="/ingredients" element={<SitePage user={user} onLogout={handleLogout} page="ingredients" />} />
        <Route path="/herbs" element={<HerbPages user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} />} />
        <Route path="/herbs/:herbId" element={<HerbPages user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} />} />
        <Route path="/about" element={<SitePage user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} page="about" />} />
        <Route path="/safety" element={<SitePage user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} page="safety" />} />
        <Route path="/privacy" element={<SitePage user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} page="privacy" />} />
        <Route path="/terms" element={<SitePage user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} page="terms" />} />

        <Route path="*" element={<SitePage user={user} onLogout={handleLogout} page="not-found" />} />
      </Routes>

      <SiteFooter />
      
      {/* Floating AI Chat - only show when authenticated */}
      {isAuthenticated && user && (
        <FloatingAIChat 
          isOpen={isAIChatOpen} 
          onClose={() => setIsAIChatOpen(false)}
          user={user}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <Router>
      <div className="app">
        <AppRoutes />
      </div>
    </Router>
  )
}
