import { useState } from 'react'
import './LandingPage.css'
import CursorGrid from './CursorGrid'
import DecryptedText from './DecryptedText'

type Tab = 'overview' | 'faculty' | 'achievements' | 'events'
type AuthTarget = 'hod' | 'teacher' | 'student'
type Session = {
  userType: AuthTarget
  name: string
}

function StudentDashboard() {
  return (
    <section className="student-dashboard">
      <h2>Student Dashboard</h2>
      <p>Welcome back to your portal.</p>
    </section>
  )
}

function LandingPage() {
  const [activeTab, setActiveTab] = useState<Tab | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authTarget, setAuthTarget] = useState<AuthTarget | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [showStudentDashboard, setShowStudentDashboard] = useState(false)

  function openLogin(target: AuthTarget) {
    setMenuOpen(false)
    setAuthTarget(target)
    setSession({ userType: target, name: target === 'student' ? 'Student' : 'User' })
    if (target === 'student') {
      setShowStudentDashboard(true)
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Department Overview' },
    { id: 'faculty', label: 'Faculty' },
    { id: 'achievements', label: 'Student Achievements' },
    { id: 'events', label: 'Upcoming Events' },
  ]

  if (showStudentDashboard) {
    return <StudentDashboard />
  }

  return (
    <main className="landing-page">
      <section className="university-section">
        <img src="/university-logo.png" alt="University Logo" />
      </section>

      <section className="department-section">
        <div className="department-title">
          <DecryptedText text="Department of Computer Science & Engineering" speed={100} maxIterations={20} />
        </div>

        <div className="hero-scroll-hint">
          <span>Scroll to explore</span>
          <div className="scroll-line" />
        </div>
      </section>

      <div className="menu-container">
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
          ⋮
        </button>

        {menuOpen && (
          <div className="login-menu">
            <button onClick={() => openLogin('hod')}>HOD Login</button>
            <button onClick={() => openLogin('teacher')}>Teacher Login</button>
            <button onClick={() => openLogin('student')}>Student Login</button>
          </div>
        )}
      </div>

      {session && authTarget && (
        <div className="auth-status">
          Logged in as {authTarget}
        </div>
      )}

      <nav className={`tabs ${activeTab ? 'tabs-hidden' : ''}`}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab && (
        <section className="tab-content">
          {activeTab === 'overview' && (
            <section className="overview-page">
              <div className="cursor-grid-wrapper">
                <CursorGrid />
              </div>

              <div className="overview-heading">
                <span>01 — Department</span>
                <h2 id="overview">Department Overview</h2>
              </div>

              <section className="overview-section section-one">
                <div className="card-inner">
                  <div className="section-ghost-number">01</div>

                  <div className="card-content">
                    <div className="section-number">01</div>

                    <div className="section-content">
                      <h3>Welcome to the Department of Computer Science and Engineering</h3>

                      <p>
                        The 21st century is known as the technical era, and Computer Science is one of
                        the core fields most impacted by this rapid transformation.
                      </p>

                      <p>
                        Our department provides students with opportunities to explore software
                        development, artificial intelligence, data science, cybersecurity, cloud
                        computing, and emerging technologies.
                      </p>

                      <div className="overview-grid">
                        <div>
                          <small>Established</small>
                          <strong>2005</strong>
                        </div>

                        <div>
                          <small>Students</small>
                          <strong>500+</strong>
                        </div>

                        <div>
                          <small>Faculty</small>
                          <strong>25+</strong>
                        </div>

                        <div>
                          <small>Programs</small>
                          <strong>04</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </section>
          )}

          {activeTab === 'faculty' && (
            <section className="content-section faculty-section" id="faculty">
              <div className="content-heading">
                <span>02 — Academics</span>
                <h2>Faculty</h2>
              </div>
              <p>Faculty content will be added here later.</p>
            </section>
          )}

          {activeTab === 'achievements' && (
            <section className="content-section achievements-section" id="achievements">
              <div className="content-heading">
                <span>03 — Students</span>
                <h2>Student Achievements</h2>
              </div>
              <p>Student achievement content will be added here later.</p>
            </section>
          )}

          {activeTab === 'events' && (
            <section className="content-section events-section" id="events">
              <div className="content-heading">
                <span>04 — Campus</span>
                <h2>Upcoming Events</h2>
              </div>
              <p>Event content will be added here later.</p>
            </section>
          )}
        </section>
      )}
    </main>
  )
}

export default LandingPage