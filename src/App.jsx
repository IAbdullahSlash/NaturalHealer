import React, { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { signOutUser } from './services/authService'
import LandingPage from './components/LandingPage'

// Every page but the landing page loads on demand, so the first visit downloads less
const Login = lazy(() => import('./components/Login'))
const Signup = lazy(() => import('./components/Signup'))
const ForgotPassword = lazy(() => import('./components/ForgotPassword'))
const Homepage = lazy(() => import('./components/Homepage'))
const Prakriti = lazy(() => import('./components/Prakriti'))
const Account = lazy(() => import('./components/Account'))
const FloatingAIChat = lazy(() => import('./components/FloatingAIChat'))
const SitePage = lazy(() => import('./components/SitePage'))
const HerbPages = lazy(() => import('./components/HerbPages'))
import { VaidyaAvatar } from './components/Vaidya'
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
      <Suspense fallback={<div className="page-loading" role="status" aria-label="Loading" />}>
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
        <Route path="/dataset" element={<SitePage user={user} onLogout={handleLogout} onOpenAIChat={() => setIsAIChatOpen(true)} page="dataset" />} />

        <Route path="*" element={<SitePage user={user} onLogout={handleLogout} page="not-found" />} />
      </Routes>
      </Suspense>

      <SiteFooter />
      
      {/* Floating AI Chat - only show when authenticated */}
      {isAuthenticated && user && (
        <Suspense fallback={null}>
          <FloatingAIChat 
            isOpen={isAIChatOpen} 
            onClose={() => setIsAIChatOpen(false)}
            user={user}
          />
        </Suspense>
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
