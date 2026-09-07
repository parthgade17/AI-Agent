import { useState } from 'react'
import './LandingPage.css'

type Tab = 'overview' | 'faculty' | 'achievements' | 'events'

function LandingPage() {
  const [activeTab, setActiveTab] = useState<Tab | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const tabs = [
    { id: 'overview' as Tab, label: 'Department Overview' },
    { id: 'faculty' as Tab, label: 'Faculty' },
    { id: 'achievements' as Tab, label: 'Student Achievements' },
    { id: 'events' as Tab, label: 'Upcoming Events' },
  ]

  return (
    <main className="landing-page">

      {/* University */}
      <section className="university-section">
        <img
          src="/university-logo.png"
          alt="University Logo"
        />
      </section>

      {/* Department */}
      <section className="department-section">
        <h1>
          Department of Computer Science & Engineering
        </h1>
      </section>

      {/* Three Dot Menu */}
      <div className="menu-container">
        <button
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="login-menu">
            <button>HOD Login</button>
            <button>Teacher Login</button>
            <button>Student Login</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <nav className={`tabs ${activeTab ? 'tabs-hidden' : ''}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      {activeTab && (
        <section className="tab-content">

          <button
            className="back-button"
            onClick={() => setActiveTab(null)}
          >
            ← Back
          </button>

          {activeTab === 'overview' && (
            <div className="overview">

              <span>DEPARTMENT</span>

              <h2>Department Overview</h2>

              <p>
                The Department of Computer Science and Engineering
                focuses on developing strong foundations in computing,
                technology, innovation, and problem solving.
              </p>

              <p>
                Our department provides students with opportunities
                to explore software development, artificial
                intelligence, data science, cybersecurity, cloud
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
          )}

          {activeTab === 'faculty' && (
            <div className="placeholder">
              <h2>Faculty</h2>
              <p>Faculty information will appear here.</p>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="placeholder">
              <h2>Student Achievements</h2>
              <p>Student achievements will appear here.</p>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="placeholder">
              <h2>Upcoming Events</h2>
              <p>Upcoming events will appear here.</p>
            </div>
          )}

        </section>
      )}

    </main>
  )
}

export default LandingPage