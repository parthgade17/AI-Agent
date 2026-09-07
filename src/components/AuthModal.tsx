import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Role, Session } from '../api'
import './AuthModal.css'

export interface AuthTarget {
  role: Role
  label: string
}

type Mode = 'login' | 'signup'

interface Props {
  target: AuthTarget
  onClose: () => void
  onSuccess: (session: Session) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MOBILE_RE = /^[6-9]\d{9}$/

function AuthModal({ target, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Close on Escape, and stop the page behind from scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function switchMode(next: Mode) {
    setMode(next)
    setErrors({})
    setServerError('')
  }

  function validate(): boolean {
    const e: Record<string, string> = {}

    if (!email.trim()) e.email = 'Email is required'
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address'

    if (!password) e.password = 'Password is required'
    else if (mode === 'signup' && password.length < 8)
      e.password = 'Use at least 8 characters'

    if (mode === 'signup') {
      if (!name.trim()) e.name = 'Full name is required'
      if (!mobile.trim()) e.mobile = 'Mobile number is required'
      else if (!MOBILE_RE.test(mobile.trim()))
        e.mobile = 'Enter a valid 10-digit mobile number'
      if (!confirm) e.confirm = 'Please confirm your password'
      else if (confirm !== password) e.confirm = 'Passwords do not match'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit() {
    if (busy || !validate()) return
    setBusy(true)
    setServerError('')
    try {
      const session =
        mode === 'login'
          ? await api.login(email.trim(), password)
          : await api.signup({
              name: name.trim(),
              email: email.trim(),
              mobile: mobile.trim(),
              password,
              role: target.role,
            })
      onSuccess(session)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  const field = (key: string) => (errors[key] ? 'auth-input auth-input-error' : 'auth-input')

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="auth-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="auth-header">
          <span className="auth-badge">{target.label}</span>
          <h2>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</h2>
          <p>Department of Computer Science &amp; Engineering</p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <div className="auth-form" onKeyDown={(e) => e.key === 'Enter' && submit()}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                className={field('name')}
                value={name}
                placeholder="Pranav Jadhav"
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <span className="auth-error">{errors.name}</span>}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              className={field('email')}
              type="email"
              autoComplete="email"
              value={email}
              placeholder="name@sanjivani.edu.in"
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <span className="auth-error">{errors.email}</span>}
          </div>

          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-mobile">Mobile number</label>
              <div className="auth-mobile">
                <span className="auth-prefix">+91</span>
                <input
                  id="auth-mobile"
                  className={field('mobile')}
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  placeholder="9876543210"
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {errors.mobile && <span className="auth-error">{errors.mobile}</span>}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-password">
              <input
                id="auth-password"
                className={field('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-reveal"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span className="auth-error">{errors.password}</span>}
          </div>

          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-confirm">Confirm password</label>
              <input
                id="auth-confirm"
                className={field('confirm')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {errors.confirm && <span className="auth-error">{errors.confirm}</span>}
            </div>
          )}

          {serverError && <div className="auth-server-error">{serverError}</div>}

          <button className="auth-submit" onClick={submit} disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? `Sign in as ${target.label}`
                : 'Create account'}
          </button>

          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthModal