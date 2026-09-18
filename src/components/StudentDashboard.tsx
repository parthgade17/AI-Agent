import { useState } from 'react'
import { useEffect } from 'react'
import { studentApi } from '../api'
import type { PublicEvent, Session, LabRow, AnnouncementRow } from '../api'
import './StudentDashboard.css'

import ProfileSection from './ProfileSection'
import AchievementSection from './AchievementSection'
import AiChat from './AiChat'

interface Props {
  session: Session
  onSignOut: () => void
}

const MENU_ITEMS = [
  'Dashboard',
  'Labs',
  'Events',
  'Announcements',
  'My Profile',
  'Achievements',
  'AI Agent',
]

function StudentDashboard({ session, onSignOut }: Props) {
  const [activeSection, setActiveSection] = useState('Dashboard')

  const token = session.token
  const initial = session.name.charAt(0).toUpperCase()

  /* =========================
     SIMPLE LIST SECTIONS
  ========================= */

  function LabsSection() {
    const [rows, setRows] = useState<LabRow[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
      studentApi.labs(token).then(setRows).catch((e) => setError(e.message))
    }, [])

    return (
      <section className="student-content">

        <span className="student-section-label">01 · LABORATORIES</span>

        <h2>Labs</h2>

        {error && <p>{error}</p>}

        <div className="student-module-grid">

          {rows.map((l) => (
            <div className="student-module-card" key={l.name}>

              <h3>
                {l.name}

                {l.is_coe && (
                  <span className="student-tag">Centre of Excellence</span>
                )}
              </h3>

              <p className="student-module-sub">
                {l.total_systems ? `${l.total_systems} systems` : ''}
                {l.operating_system ? ` · ${l.operating_system}` : ''}
                {l.is_24x7 ? ' · Open 24×7' : ''}
              </p>

              {l.processor && (
                <p className="student-module-sub">
                  {l.processor} · {l.memory}
                </p>
              )}

              {l.features && <p>{l.features}</p>}

              {l.sponsored_by && (
                <p className="student-module-sub">Sponsored by {l.sponsored_by}</p>
              )}

            </div>
          ))}

          {!rows.length && !error && <p>Loading laboratories…</p>}

        </div>

      </section>
    )
  }

  function EventsSection() {
    const [rows, setRows] = useState<PublicEvent[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
      studentApi.events(token).then(setRows).catch((e) => setError(e.message))
    }, [])

    return (
      <section className="student-content">

        <span className="student-section-label">02 · EVENTS</span>

        <h2>Upcoming Events</h2>

        {error && <p>{error}</p>}

        <div className="student-module-grid">

          {rows.map((e) => (
            <div className="student-module-card" key={e.id}>

              <h3>
                {e.title}

                <span className="student-tag">
                  {e.scope === 'institute' ? 'College' : 'Department'}
                </span>
              </h3>

              <p className="student-module-sub">
                {new Date(e.starts_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {e.venue ? ` · ${e.venue}` : ''}
              </p>

              {e.description && <p>{e.description}</p>}

              {e.speaker && (
                <p className="student-module-sub">Speaker: {e.speaker}</p>
              )}

            </div>
          ))}

          {!rows.length && !error && <p>No upcoming events.</p>}

        </div>

      </section>
    )
  }

  function AnnouncementsSection() {
    const [rows, setRows] = useState<AnnouncementRow[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
      studentApi.announcements(token).then(setRows).catch((e) => setError(e.message))
    }, [])

    return (
      <section className="student-content">

        <span className="student-section-label">03 · ANNOUNCEMENTS</span>

        <h2>Announcements</h2>

        {error && <p>{error}</p>}

        <div className="student-module-grid">

          {rows.map((a) => (
            <div className="student-module-card" key={a.id}>

              <h3>
                {a.title}
                {a.is_pinned && <span className="student-tag">Pinned</span>}
              </h3>

              <p className="student-module-sub">
                {new Date(a.published_at).toLocaleDateString('en-IN')}
              </p>

              <p>{a.body}</p>

            </div>
          ))}

          {!rows.length && !error && <p>No announcements yet.</p>}

        </div>

      </section>
    )
  }

  /* =========================
     LAYOUT
  ========================= */

  return (
    <div className="student-dashboard">

      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

      <aside className="student-sidebar">

        <div className="student-brand">

          <div className="student-brand-icon">S</div>

          <div>
            <h2>Student Portal</h2>
            <span>Student Dashboard</span>
          </div>

        </div>

        <nav className="student-navigation">

          {MENU_ITEMS.map((item) => (
            <button
              key={item}
              className={`student-nav-item ${activeSection === item ? 'active' : ''}`}
              onClick={() => setActiveSection(item)}
            >
              {item}
            </button>
          ))}

        </nav>

        <button className="student-logout" onClick={onSignOut}>
          Sign Out
        </button>

      </aside>

      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <main className="student-main">

        <header className="student-top-header">

          <div>
            <h1>{activeSection}</h1>
            <p>Welcome back, {session.name.split(' ')[0]}</p>
          </div>

          <div className="student-user">
            <div className="student-avatar">{initial}</div>
            <div>
              <strong>{session.name}</strong>
              <span>{session.role_label}</span>
            </div>
          </div>

        </header>

        {activeSection === 'Dashboard' && (
          <section className="student-content">

            <div className="student-welcome-card">
              <div>
                <h2>Welcome to your Student Dashboard</h2>
                <p>
                  Access your academic resources, achievements, events and
                  department services from one place.
                </p>
              </div>
            </div>

          </section>
        )}

        {activeSection === 'Labs' && <LabsSection />}

        {activeSection === 'Events' && <EventsSection />}

        {activeSection === 'Announcements' && <AnnouncementsSection />}

        {activeSection === 'My Profile' && (
          <section className="student-content">
            <ProfileSection token={token} />
          </section>
        )}

        {activeSection === 'Achievements' && (
          <section className="student-content">
            <AchievementSection token={token} />
          </section>
        )}

        {activeSection === 'AI Agent' && (
          <section className="student-content">

            <span className="student-section-label">06 · AI AGENT</span>

            <h2>AI Agent</h2>

            <p>
              Ask about faculty, labs, events, achievements, or academics —
              the agent only answers from the department's own records.
            </p>

            <div style={{ marginTop: 20 }}>
              <AiChat
                token={token}
                placeholder="Ask about faculty, labs, events, achievements, or academics…"
              />
            </div>

          </section>
        )}

      </main>

    </div>
  )
}

export default StudentDashboard