import { Component, useEffect, useLayoutEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './LandingPage.css'
import CursorGrid from './CursorGrid'
import DecryptedText from './DecryptedText'
import AuthModal from './AuthModal'
import HodDashboard from './HodDashboard'
import StudentDashboard from './StudentDashboard'
import TeacherDashboard from './TeacherDashboard'
import type { AuthTarget } from './AuthModal'
import { publicApi } from '../api'
import type {
  PublicAchievements, PublicDepartment, PublicEvents, PublicFaculty, Session,
} from '../api'

gsap.registerPlugin(ScrollTrigger)

/* ===========================================================================
   A dashboard that throws while rendering must not silently bounce the user
   back to the landing page. This shows what actually failed.
   =========================================================================== */

class DashboardBoundary extends Component<
  { children: ReactNode; onSignOut: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard failed to render:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    const message = this.state.error.message

    return (
      <main className="landing-page">
        <section className="overview-page">
          <div className="overview-grid">
            <section className="overview-section section-one">
              <div className="card-inner">
                <div className="section-ghost-number">!</div>
                <div className="card-content">
                  <div className="section-number">DASHBOARD ERROR</div>
                  <div className="section-content">
                    <h3>The dashboard could not be displayed</h3>

                    <p><strong>{message}</strong></p>

                    {/undefined is not a function|Cannot read propert|is not a function/i
                      .test(message) && (
                      <p>
                        This usually means src/api.ts is missing one of its
                        clients. It must export api, hodApi, studentApi,
                        facultyApi and publicApi. Check that you copied the
                        latest api.ts.
                      </p>
                    )}

                    <p>
                      The full stack trace is in the browser console (F12).
                    </p>

                    <button
                      className="progress-item active"
                      onClick={this.props.onSignOut}
                      style={{ width: 'auto', opacity: 1 }}
                    >
                      <span className="progress-number">SIGN OUT</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    )
  }
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(0)

  /* =========================================================
     AUTHENTICATION
     ========================================================= */

  const [authTarget, setAuthTarget] = useState<AuthTarget | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  function signOut() {
    setSession(null)
    setMenuOpen(false)
  }

  function openLogin(target: AuthTarget) {
    setMenuOpen(false)
    setAuthTarget(target)
  }

  /* =========================================================
     DEPARTMENT DATA
     Loaded from the database. The AI agent ingests the same
     rows, so the page and the assistant cannot disagree.
     ========================================================= */

  const [dept, setDept] = useState<PublicDepartment | null>(null)
  const [facultyList, setFacultyList] = useState<PublicFaculty[]>([])
  const [achv, setAchv] = useState<PublicAchievements | null>(null)
  const [events, setEvents] = useState<PublicEvents | null>(null)

  useEffect(() => {
    // allSettled, so one failing endpoint cannot blank the others.
    Promise.allSettled([
      publicApi.department(),
      publicApi.faculty(),
      publicApi.achievements(),
      publicApi.events(),
    ]).then(([d, f, a, e]) => {
      if (d.status === 'fulfilled') setDept(d.value)
      if (f.status === 'fulfilled') setFacultyList(f.value ?? [])
      if (a.status === 'fulfilled') setAchv(a.value)
      if (e.status === 'fulfilled') setEvents(e.value)
    })
  }, [])

  const ready = Boolean(dept || facultyList.length || achv || events)

useLayoutEffect(() => {
  const sections =
    gsap.utils.toArray<HTMLElement>('.overview-section')

  const cleanupFunctions: (() => void)[] = []

  const ctx = gsap.context(() => {
    sections.forEach((section, index) => {
      const card =
        section.querySelector<HTMLElement>('.card-inner')

      const content =
        section.querySelector<HTMLElement>('.card-content')

      const ghost =
        section.querySelector<HTMLElement>(
          '.section-ghost-number'
        )

      if (!card) return

      /* -----------------------------------
         SCROLL REVEAL
      ----------------------------------- */

      gsap.fromTo(
        section,
        {
          opacity: 0,
          y: 70,
          scale: 0.94,
          rotateX: index % 2 === 0 ? -4 : 4,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      /* -----------------------------------
         CONTENT REVEAL
      ----------------------------------- */

      if (content) {
        gsap.fromTo(
          content,
          {
            opacity: 0,
            y: 25,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        )
      }

      /* -----------------------------------
         FLOATING BACKGROUND NUMBER
      ----------------------------------- */

      if (ghost) {
        gsap.to(ghost, {
          y: -45,
          rotate: index % 2 === 0 ? -4 : 4,
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        })
      }

      /* -----------------------------------
         MOUSE TILT
      ----------------------------------- */

      const xTo = gsap.quickTo(card, 'x', {
        duration: 0.35,
        ease: 'power3.out',
      })

      const yTo = gsap.quickTo(card, 'y', {
        duration: 0.35,
        ease: 'power3.out',
      })

      const rotateXTo = gsap.quickTo(
        card,
        'rotateX',
        {
          duration: 0.4,
          ease: 'power3.out',
        }
      )

      const rotateYTo = gsap.quickTo(
        card,
        'rotateY',
        {
          duration: 0.4,
          ease: 'power3.out',
        }
      )

      const handleMouseMove = (
        event: MouseEvent
      ) => {
        const rect =
          section.getBoundingClientRect()

        const x =
          (event.clientX - rect.left) /
          rect.width

        const y =
          (event.clientY - rect.top) /
          rect.height

        const normalizedX =
          x * 2 - 1

        const normalizedY =
          y * 2 - 1

        const moveX =
          normalizedX * 8

        const moveY =
          normalizedY * 8

        const rotateY =
          normalizedX * 9

        const rotateX =
          normalizedY * -9

        xTo(moveX)
        yTo(moveY)

        rotateXTo(rotateX)
        rotateYTo(rotateY)
      }

      const handleMouseEnter = () => {
        gsap.to(card, {
          scale: 1.02,
          z: 15,
          duration: 0.3,
          ease: 'power3.out',
        })

        gsap.to(section, {
          boxShadow:
            '0 35px 90px rgba(0,0,0,0.15)',
          duration: 0.3,
          ease: 'power2.out',
        })
      }

      const handleMouseLeave = () => {
        xTo(0)
        yTo(0)

        rotateXTo(0)
        rotateYTo(0)

        gsap.to(card, {
          scale: 1,
          z: 0,
          duration: 0.7,
          ease: 'power3.out',
        })

        gsap.to(section, {
          boxShadow:
            '0 15px 40px rgba(0,0,0,0.06)',
          duration: 0.5,
          ease: 'power2.out',
        })
      }

      section.addEventListener(
        'mousemove',
        handleMouseMove
      )

      section.addEventListener(
        'mouseenter',
        handleMouseEnter
      )

      section.addEventListener(
        'mouseleave',
        handleMouseLeave
      )

      cleanupFunctions.push(() => {
        section.removeEventListener(
          'mousemove',
          handleMouseMove
        )

        section.removeEventListener(
          'mouseenter',
          handleMouseEnter
        )

        section.removeEventListener(
          'mouseleave',
          handleMouseLeave
        )

        xTo.tween.kill()
        yTo.tween.kill()
        rotateXTo.tween.kill()
        rotateYTo.tween.kill()
      })
    })

    /* -----------------------------------
       OVERVIEW HEADING
    ----------------------------------- */

    gsap.from('.overview-heading span', {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: 'power3.out',
    })

    gsap.from('.overview-heading h2', {
      opacity: 0,
      y: 35,
      scale: 0.97,
      duration: 0.8,
      delay: 0.1,
      ease: 'power3.out',
    })

    /* -----------------------------------
       SIDE PROGRESS TRACKING
    ----------------------------------- */

    const tracked = ['overview', 'faculty', 'achievements', 'events']

    tracked.forEach((id, index) => {
      const el = document.getElementById(id)
      if (!el) return

      ScrollTrigger.create({
        trigger: el,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => setActiveSection(index),
        onEnterBack: () => setActiveSection(index),
      })
    })
  })

  return () => {
    cleanupFunctions.forEach(
      (cleanup) => cleanup()
    )

    ctx.revert()
  }
  // Re-runs once the department data has rendered, so the cards created from
  // it get their scroll triggers too.
}, [ready, facultyList.length, achv, events])

  /*
   * ======================================================
   * NAVIGATION
   * ======================================================
   */

  const scrollToSection = (
    id: string
  ) => {
    const section =
      document.getElementById(id)

    if (!section) return

    const offset =
      window.innerWidth <= 768
        ? 90
        : 100

    const target =
      section.getBoundingClientRect().top +
      window.scrollY -
      window.innerHeight / 2 +
      offset

    window.scrollTo({
      top: target,
      behavior: 'smooth',
    })

    setMenuOpen(false)
  }

  /*
   * ======================================================
   * PROGRESS INDICATOR
   * ======================================================
   */

  const progressSections = [
    'overview',
    'faculty',
    'achievements',
    'events',
  ]

  const progressTargets = [
    'overview',
    'faculty',
    'achievements',
    'events',
  ]

  /*
   * ======================================================
   * ROLE ROUTING
   * A signed-in user goes straight to their dashboard.
   * ======================================================
   */

  if (session) {
    const dashboard =
      session.role === 'admin' ? (
        <HodDashboard session={session} onClose={signOut} />
      ) : session.role === 'faculty' ? (
        <TeacherDashboard session={session} onLogout={signOut} />
      ) : session.role === 'student' ? (
        <StudentDashboard session={session} onSignOut={signOut} />
      ) : null

    if (dashboard) {
      return (
        <DashboardBoundary onSignOut={signOut}>{dashboard}</DashboardBoundary>
      )
    }

    // A role with no portal: say so rather than falling through to the
    // landing page, which looks exactly like a failed login.
    return (
      <main className="landing-page">
        <section className="overview-page">
          <div className="overview-grid">
            <section className="overview-section section-one">
              <div className="card-inner">
                <div className="card-content">
                  <div className="section-content">
                    <h3>No dashboard for this account</h3>
                    <p>
                      This account has the role "{session.role}", which has no
                      portal. Contact the department office.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    )
  }

  /* Small helper so every generated card keeps the exact markup the
     stylesheet and the GSAP selectors expect. */
  const TONES = [
    'section-one', 'section-two', 'section-three', 'section-four', 'section-five',
  ]

  const card = (
    index: number,
    title: string,
    body: React.ReactNode,
    key?: string,
  ) => (
    <section
      className={`overview-section ${TONES[(index - 1) % TONES.length]}`}
      key={key ?? title}
    >
      <div className="card-inner">
        <div className="section-ghost-number">
          {String(index).padStart(2, '0')}
        </div>

        <div className="card-content">
          <div className="section-number">
            {String(index).padStart(2, '0')}
          </div>

          <div className="section-content">
            <h3>{title}</h3>
            {body}
          </div>
        </div>
      </div>
    </section>
  )

  const paras = (text: string | null | undefined) =>
    (text ?? '').split('\n\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)

  const fmt = (value: string, withTime = false) => {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
      ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    })
  }

  return (
    <main className="landing-page">

      {/* ===============================================
          UNIVERSITY
      ================================================ */}

      <section className="university-section">

        <img
          src="/university-logo.png"
          alt="Sanjivani University Logo"
        />

      </section>


      {/* ===============================================
          DEPARTMENT HERO
      ================================================ */}

      <section className="department-section">
        <div className="department-title">
          <DecryptedText
            text="Department of Computer Science & Engineering"
            speed={100}
            maxIterations={20}
          />
        </div>

        <div className="hero-scroll-hint">
          <span>Scroll to explore</span>
          <div className="scroll-line" />
        </div>
      </section>


      {/* ===============================================
          MENU
      ================================================ */}

      <div className="menu-container">

        <button
          className="menu-button"
          onClick={() =>
            setMenuOpen(
              (value) => !value
            )
          }
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="login-menu">

            <button
              onClick={() =>
                openLogin({ role: 'admin', label: 'HOD' })
              }
            >
              HOD Login
            </button>

            <button
              onClick={() =>
                openLogin({ role: 'faculty', label: 'Teacher' })
              }
            >
              Teacher Login
            </button>

            <button
              onClick={() =>
                openLogin({ role: 'student', label: 'Student' })
              }
            >
              Student Login
            </button>

          </div>
        )}

      </div>


      {/* ===============================================
          NAVIGATION
      ================================================ */}

      <nav className="tabs">

        <button onClick={() => scrollToSection('overview')}>
          Department Overview
        </button>

        <button onClick={() => scrollToSection('faculty')}>
          Faculty
        </button>

        <button onClick={() => scrollToSection('achievements')}>
          Student Achievements
        </button>

        <button onClick={() => scrollToSection('events')}>
          Upcoming Events
        </button>

      </nav>


      {/* ===============================================
          SIDE PROGRESS
      ================================================ */}

      <div className="section-progress">

        {progressSections.map(
          (label, index) => (
            <button
              key={label}
              className={
                activeSection === index
                  ? 'progress-item active'
                  : 'progress-item'
              }
              onClick={() =>
                scrollToSection(
                  progressTargets[index]
                )
              }
              aria-label={`Go to ${label}`}
            >
              <span className="progress-number">
                {String(index + 1).padStart(
                  2,
                  '0'
                )}
              </span>

              <span className="progress-dot" />
            </button>
          )
        )}

      </div>


      {/* ===============================================
          OVERVIEW
      ================================================ */}

      <section className="overview-page">

        <div className="cursor-grid-wrapper">
          <CursorGrid />
        </div>

        <div className="overview-heading">
          <span>01 — Department</span>
          <h2 id="overview">Department Overview</h2>
        </div>

        <div className="overview-grid">

          {/* 01 — WELCOME. Database text when present, the original
              copy as a fallback so this card is never empty. */}
          {card(1,
            dept
              ? `Welcome to the ${dept.name}`
              : 'Welcome to the Department of Computer Science and Engineering',
            dept?.about ? paras(dept.about) : (
              <>
                <p>
                  The 21st century is known as the technical era, and Computer
                  Science is one of the core fields most impacted by this rapid
                  transformation.
                </p>
                <p>
                  Keeping these versatile needs in mind, Sanjivani University
                  established the Department of Computer Science and Engineering
                  in 2024. The department has highly qualified faculty members,
                  fully digitally equipped classrooms, and state-of-the-art
                  laboratories.
                </p>
                <p>
                  It follows all rules and regulations laid down by NEP-2020,
                  with flexibility to meet industry requirements and
                  choice-based subject selection.
                </p>
              </>
            ),
          )}

          {/* 02 — ABOUT / PROGRAMMES */}
          {card(2, 'About Us', (
            <>
              <p>
                The Department of Computer Science and Engineering at Sanjivani
                University is committed to excellence in education and research
                in full stack development with focus on domains such as Computer
                Vision, Machine Learning, Digital Twins etc.
              </p>

              <div className="about-grid">
                <div>
                  <h4>Programs Offered</h4>
                  <ul>
                    {dept?.courses?.length ? (
                      dept.courses.map((c) => (
                        <li key={c.name}>
                          <strong>{c.degree_level}:</strong>{' '}
                          {c.name}
                          {c.duration_years ? `, ${c.duration_years} years` : ''}
                        </li>
                      ))
                    ) : (
                      <>
                        <li><strong>Undergraduate:</strong> B.Tech CSE curriculum powered by HCLTech</li>
                        <li><strong>Postgraduate:</strong> M.Tech in CSE</li>
                        <li><strong>Research:</strong> Ph.D. in CSE</li>
                      </>
                    )}
                  </ul>
                </div>

                <div>
                  <h4>{dept?.subjects?.length ? 'Core AI Courses' : 'Features'}</h4>
                  <ul>
                    {dept?.subjects?.length ? (
                      dept.subjects.map((s) => (
                        <li key={s.code}>
                          <strong>{s.name}</strong> — {s.code}
                        </li>
                      ))
                    ) : (
                      <>
                        <li><strong>HCLTech-Powered Syllabus</strong> – Industry-aligned curriculum with real-world exposure</li>
                        <li><strong>Advanced Labs</strong> – High-performance GPUs, Computer Vision Lab, Data Science &amp; Analytics Lab, Robotics &amp; Automation Lab</li>
                        <li><strong>Industry Collaborations</strong> – MOUs with leading organizations including HCLTech</li>
                        <li><strong>Student Activities</strong> – ACSES, Hackathons, Workshops, International Expert Sessions, Industry Visits</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </>
          ))}

          {/* 03 — VISION */}
          {card(3, 'Vision',
            dept?.vision ? <p>{dept.vision}</p> : (
              <p>
                To achieve global recognition in the field of computer science
                and engineering department through innovative curriculum and
                quality in Education, Research, Innovation and Entrepreneurship
                to produce effective leaders for serving the societal
                challenges.
              </p>
            ),
          )}

          {/* 04 — MISSION */}
          {card(4, 'Mission', (
            <ul className="mission-list">
              {dept?.mission
                ? dept.mission.split('\n\n').filter(Boolean).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))
                : (
                  <>
                    <li>To provide the platform to become industry ready technocrats as a full stack developer and a curriculum tailored to industry needs, with a focus on complex problem-solving skills.</li>
                    <li>To impart high quality Experiential learning in modern software tools and to cater to the real time requirements of the industry.</li>
                    <li>To develop quality research with both national and international to enhance learning and research through research ecosystem.</li>
                    <li>To promote a supportive and positive community by engaging initiatives that contributes to societal well-being and fulfils institutional social responsibility.</li>
                  </>
                )}
            </ul>
          ))}

          {/* 05 — LABORATORIES, from the database */}
          {dept?.labs?.length ? card(5, 'Laboratories and Facilities', (
            <div className="outcomes-grid">
              {[
                dept.labs.slice(0, Math.ceil(dept.labs.length / 2)),
                dept.labs.slice(Math.ceil(dept.labs.length / 2)),
              ].map((column, ci) => (
                <div className="outcomes-column" key={ci}>
                  {column.map((lab) => (
                    <p key={lab.name}>
                      <strong>{lab.name}</strong>
                      {[
                        lab.total_systems ? `${lab.total_systems} systems` : null,
                        lab.operating_system,
                        lab.is_coe ? 'Centre of Excellence' : null,
                        lab.is_24x7 ? 'Open 24×7' : null,
                        lab.sponsored_by ? `Sponsored by ${lab.sponsored_by}` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )) : null}

          {/* 06 — HOD MESSAGE */}
          {dept?.hod_message
            ? card(6, 'From the Head of Department', <p>{dept.hod_message}</p>)
            : null}

        </div>

      </section>


      {/* =================================================
          FACULTY
      ================================================= */}

      <section
        className="content-section faculty-section"
        id="faculty"
      >
        <div className="content-heading">
          <span>02 — Academics</span>
          <h2>Faculty</h2>
        </div>
      </section>

      <section className="overview-page">
        <div className="overview-grid">
          {facultyList.length
            ? facultyList.map((f, i) =>
                card(
                  i + 1,
                  f.is_hod ? `${f.name} — Head of Department` : f.name,
                  <>
                    {f.designation && <p><strong>{f.designation}</strong></p>}
                    {f.qualification && <p>{f.qualification}</p>}
                    {f.specialization && <p>Specialization: {f.specialization}</p>}
                    {f.research_areas && <p>Research areas: {f.research_areas}</p>}
                    <p>
                      {[
                        `${f.publications} publication${f.publications === 1 ? '' : 's'}`,
                        f.scholars > 0
                          ? `guiding ${f.scholars} research scholar${f.scholars === 1 ? '' : 's'}`
                          : null,
                        f.experience_years ? `${f.experience_years} years experience` : null,
                        f.office_location,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </>,
                  `f-${f.id}`,
                ),
              )
            : card(1, 'Faculty records are being added',
                <p>Faculty profiles will appear here once they are recorded.</p>)}
        </div>
      </section>


      {/* =================================================
          STUDENT ACHIEVEMENTS
      ================================================= */}

      <section
        className="content-section achievements-section"
        id="achievements"
      >
        <div className="content-heading">
          <span>03 — Students</span>
          <h2>Student Achievements</h2>
        </div>
      </section>

      <section className="overview-page">
        <div className="overview-grid">
          {(() => {
            const items = [
              ...(achv?.students ?? []).map((a) => ({
                title: `${a.student_name} — ${a.title}`,
                meta: [a.position, a.event_name, a.organiser].filter(Boolean).join(' · '),
                body: a.description,
              })),
              ...(achv?.department ?? []).map((a) => ({
                title: a.title,
                meta: [a.venue, a.achieved_on ? fmt(a.achieved_on) : null]
                  .filter(Boolean).join(' · '),
                body: a.description,
              })),
            ]

            if (!items.length) {
              return card(1, 'No published achievements yet',
                <p>
                  Student achievements appear here once a faculty member has
                  verified them.
                </p>)
            }

            return items.map((a, i) =>
              card(i + 1, a.title, (
                <>
                  {a.meta && <p><strong>{a.meta}</strong></p>}
                  {a.body && <p>{a.body}</p>}
                </>
              ), `a-${i}`),
            )
          })()}
        </div>
      </section>


      {/* =================================================
          UPCOMING EVENTS
      ================================================= */}

      <section
        className="content-section events-section"
        id="events"
      >
        <div className="content-heading">
          <span>04 — Campus</span>
          <h2>Upcoming Events</h2>
        </div>
      </section>

      <section className="overview-page">
        <div className="overview-grid">
          {(() => {
            const items = [
              ...(events?.upcoming ?? []).map((e) => ({ e, upcoming: true })),
              ...(events?.past ?? []).map((e) => ({ e, upcoming: false })),
            ]

            if (!items.length) {
              return card(1, 'No events recorded yet',
                <p>Department and college events will be listed here.</p>)
            }

            return items.map(({ e, upcoming }, i) =>
              card(i + 1, e.title, (
                <>
                  <p>
                    <strong>
                      {upcoming ? 'Upcoming' : 'Held'} ·{' '}
                      {e.scope === 'institute' ? 'College level' : 'Department level'} ·{' '}
                      {fmt(e.starts_at, upcoming)}
                    </strong>
                  </p>
                  {e.venue && <p>Venue: {e.venue}</p>}
                  {e.speaker && <p>Speaker: {e.speaker}</p>}
                  {e.description && <p>{e.description}</p>}
                </>
              ), `e-${e.id}`),
            )
          })()}
        </div>
      </section>


      {/* ===============================================
          AUTHENTICATION
      ================================================ */}

      {authTarget && (
        <AuthModal
          target={authTarget}
          onClose={() => setAuthTarget(null)}
          onSuccess={(s) => {
            // Setting the session is enough; the routing block above sends
            // the user to the dashboard for their role.
            setSession(s)
            setAuthTarget(null)
          }}
        />
      )}

    </main>
  )
}

export default LandingPage