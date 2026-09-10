import { useEffect, useState } from 'react'
import { studentApi } from '../api'
import type { PublicEvent, Session, LabRow, AnnouncementRow } from '../api'
import './StudentDashboard.css'

import ProfileSection from './ProfileSection'
import AchievementSection from './AchievementSection'
import LMSSection from './LMSSection'
import AiChat from './AiChat'

interface Props {
  session: Session
  onSignOut: () => void
}

function StudentDashboard({ session, onSignOut }: Props) {
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const token = session.token
  const initial = session.name.charAt(0).toUpperCase()

  function openModule(module: string) {
    setActiveModule(module)
  }

  function goBackToDashboard() {
    setActiveModule(null)
  }

  /* =========================
     HEADER
  ========================= */

  function Header() {
    return (
      <header className="student-header">

        <div className="student-logo">

          <div className="student-logo-icon">S</div>

          <div>
            <h2>Student Portal</h2>
          </div>

        </div>

        <div className="student-profile">

          <div className="profile-avatar">{initial}</div>

          <div>
            <strong>{session.name}</strong>

            <span>{session.role_label}</span>
          </div>

          <button className="student-signout" onClick={onSignOut}>
            Sign out
          </button>

        </div>

      </header>
    )
  }

  /* =========================
     MODULE HEADER
  ========================= */

  function ModuleHeader() {
    return (
      <>
        <Header />

        <div className="module-navigation">
          <button
            className="back-dashboard-button"
            onClick={goBackToDashboard}
          >
            ← Back to Dashboard
          </button>
        </div>
      </>
    )
  }

  /* =========================
     SIMPLE LIST MODULES
  ========================= */

  function LabsModule() {
    const [rows, setRows] = useState<LabRow[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
      studentApi.labs(token).then(setRows).catch((e) => setError(e.message))
    }, [])

    return (
      <section className="student-module">

        <span className="student-module-label">
          01 · LABORATORIES
        </span>

        <h2>Labs</h2>

        {error && <p>{error}</p>}

        <div className="student-module-grid">

          {rows.map((l) => (
            <div className="student-module-card" key={l.name}>

              <h3>
                {l.name}

                {l.is_coe && (
                  <span className="student-tag">
                    Centre of Excellence
                  </span>
                )}
              </h3>

              <p className="student-module-sub">
                {l.total_systems
                  ? `${l.total_systems} systems`
                  : ''}

                {l.operating_system
                  ? ` · ${l.operating_system}`
                  : ''}

                {l.is_24x7
                  ? ' · Open 24×7'
                  : ''}
              </p>

              {l.processor && (
                <p className="student-module-sub">
                  {l.processor} · {l.memory}
                </p>
              )}

              {l.features && (
                <p>{l.features}</p>
              )}

              {l.sponsored_by && (
                <p className="student-module-sub">
                  Sponsored by {l.sponsored_by}
                </p>
              )}

            </div>
          ))}

          {!rows.length && !error && (
            <p>Loading laboratories…</p>
          )}

        </div>

      </section>
    )
  }

  function EventsModule() {
    const [rows, setRows] = useState<PublicEvent[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
      studentApi.events(token).then(setRows).catch((e) => setError(e.message))
    }, [])

    return (
      <section className="student-module">

        <span className="student-module-label">
          02 · EVENTS
        </span>

        <h2>Upcoming Events</h2>

        {error && <p>{error}</p>}

        <div className="student-module-grid">

          {rows.map((e) => (
            <div className="student-module-card" key={e.id}>

              <h3>
                {e.title}

                <span className="student-tag">
                  {e.scope === 'institute'
                    ? 'College'
                    : 'Department'}
                </span>
              </h3>

              <p className="student-module-sub">
                {new Date(e.starts_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}

                {e.venue
                  ? ` · ${e.venue}`
                  : ''}
              </p>

              {e.description && (
                <p>{e.description}</p>
              )}

              {e.speaker && (
                <p className="student-module-sub">
                  Speaker: {e.speaker}
                </p>
              )}

            </div>
          ))}

          {!rows.length && !error && (
            <p>No upcoming events.</p>
          )}

        </div>

      </section>
    )
  }

  function AnnouncementsModule() {
    const [rows, setRows] = useState<AnnouncementRow[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
      studentApi.announcements(token)
        .then(setRows)
        .catch((e) => setError(e.message))
    }, [])

    return (
      <section className="student-module">

        <span className="student-module-label">
          03 · ANNOUNCEMENTS
        </span>

        <h2>Announcements</h2>

        {error && <p>{error}</p>}

        <div className="student-module-grid">

          {rows.map((a) => (
            <div className="student-module-card" key={a.id}>

              <h3>
                {a.title}

                {a.is_pinned && (
                  <span className="student-tag">
                    Pinned
                  </span>
                )}
              </h3>

              <p className="student-module-sub">
                {new Date(a.published_at)
                  .toLocaleDateString('en-IN')}
              </p>

              <p>{a.body}</p>

            </div>
          ))}

          {!rows.length && !error && (
            <p>No announcements yet.</p>
          )}

        </div>

      </section>
    )
  }

  function ComingSoon({
    title,
    label,
  }: {
    title: string
    label: string
  }) {
    return (
      <section className="student-module">

        <span className="student-module-label">
          {label}
        </span>

        <h2>{title}</h2>

        <p>
          This module is part of the next phase of the project and is not
          available in the prototype.
        </p>

      </section>
    )
  }

  /* =========================
     MODULE ROUTING
  ========================= */

  const modules: Record<string, React.ReactNode> = {

    profile: (
      <ProfileSection token={token} />
    ),

    achievements: (
      <AchievementSection token={token} />
    ),

    lms: (
      <LMSSection token={token} />
    ),

    labs: (
      <LabsModule />
    ),

    events: (
      <EventsModule />
    ),

    announcements: (
      <AnnouncementsModule />
    ),

    'ai-agent': (
      <section className="student-module">

        <span className="student-module-label">
          06 · AI AGENT
        </span>

        <h2>AI Agent</h2>

        <p>
          Ask about faculty, labs, events, achievements, or academics — the
          agent only answers from the department's own records.
        </p>

        <div style={{ marginTop: 20 }}>
          <AiChat
            token={token}
            placeholder="Ask about faculty, labs, events, achievements, or academics…"
          />
        </div>

      </section>
    ),
  }

  if (activeModule && modules[activeModule]) {
    return (
      <main className="student-dashboard">

        <ModuleHeader />

        {modules[activeModule]}

      </main>
    )
  }

  /* =========================
     MAIN DASHBOARD
  ========================= */

  const cards = [

    [
      '01',
      'Labs',
      'Explore available laboratories and facilities.',
      'View Labs',
      'labs',
    ],

    [
      '02',
      'Events',
      'Check upcoming college and student events.',
      'View Events',
      'events',
    ],

    [
      '03',
      'Announcements',
      'Stay updated with important announcements.',
      'View Announcements',
      'announcements',
    ],

    [
      '04',
      'My Profile',
      'View and manage your student profile.',
      'View Profile',
      'profile',
    ],

    [
      '05',
      'Achievements',
      'Add and view your academic and extracurricular achievements.',
      'My Achievements',
      'achievements',
    ],

    [
      '06',
      'AI Agent',
      'Ask questions and get AI-powered assistance.',
      'Ask AI',
      'ai-agent',
    ],

    [
      '07',
      'LMS / Dashboard',
      'Access permitted academic and LMS information.',
      'Open LMS',
      'lms',
    ],
  ]

  return (
    <main className="student-dashboard">

      <Header />

      {/* Welcome Section */}

      <section className="student-welcome">

        <div>

          <p className="welcome-label">
            STUDENT DASHBOARD
          </p>

          <h1>
            Welcome back, {session.name.split(' ')[0]}
          </h1>

          <p>
            Access your academic resources, achievements,
            events and student services from one place.
          </p>

        </div>

      </section>


      {/* Dashboard Modules */}

      <section className="dashboard-grid">

        {cards.map(
          ([num, title, body, action, key]) => (

            <div
              className={`dashboard-card${
                key.startsWith('ai')
                  ? ' ai-card'
                  : ''
              }`}
              key={key}
            >

              <div className="card-icon">
                {num}
              </div>

              <h3>
                {title}
              </h3>

              <p>
                {body}
              </p>

              <button
                onClick={() => openModule(key)}
              >
                {action}
              </button>

            </div>

          )
        )}

      </section>

    </main>
  )
}

export default StudentDashboard