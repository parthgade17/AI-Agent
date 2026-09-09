import { useLayoutEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './LandingPage.css'
import CursorGrid from './CursorGrid'
import DecryptedText from './DecryptedText'

gsap.registerPlugin(ScrollTrigger)

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(0)

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

        /*
          Convert cursor position to
          -1 → +1
        */
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
  })

  return () => {
    cleanupFunctions.forEach(
      (cleanup) => cleanup()
    )

    ctx.revert()
  }
}, [])

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
            
            <button>
              HOD Login
            </button>

            <button>
              Teacher Login
            </button>

            <button>
              Student Login
            </button>

          </div>
        )}

      </div>


      {/* ===============================================
          NAVIGATION
      ================================================ */}

      <nav className="tabs">

        <button
          onClick={() =>
            scrollToSection(
              'overview'
            )
          }
        >
          Department Overview
        </button>

        <button
          onClick={() =>
            scrollToSection(
              'faculty'
            )
          }
        >
          Faculty
        </button>

        <button
          onClick={() =>
            scrollToSection(
              'achievements'
            )
          }
        >
          Student Achievements
        </button>

        <button
          onClick={() =>
            scrollToSection(
              'events'
            )
          }
        >
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

  {/* =================================================
      CURSOR GRID
  ================================================= */}

  <div className="cursor-grid-wrapper">
    <CursorGrid />
  </div>


  {/* =================================================
      DEPARTMENT OVERVIEW HEADING
  ================================================= */}

  <div className="overview-heading">

    <span>
      01 — Department
    </span>

    <h2 id="overview">
      Department Overview
    </h2>

  </div>


  {/* =================================================
      FIVE DEPARTMENT OVERVIEW CARDS
  ================================================= */}

  <div className="overview-grid">


    {/* =============================================
        01 — WELCOME
    ============================================== */}

    <section className="overview-section section-one">

      <div className="card-inner">

        <div className="section-ghost-number">
          01
        </div>

        <div className="card-content">

          <div className="section-number">
            01
          </div>

          <div className="section-content">

            <h3>
              Welcome to the Department of
              Computer Science and Engineering
            </h3>

            <p>
              The 21st century is known as the
              technical era, and Computer Science
              is one of the core fields most impacted
              by this rapid transformation.
            </p>

            <p>
              Keeping these versatile needs in mind,
              Sanjivani University established the
              Department of Computer Science and
              Engineering in 2024. The department has
              highly qualified faculty members,
              fully digitally equipped classrooms,
              and state-of-the-art laboratories.
            </p>

            <p>
              It follows all rules and regulations
              laid down by NEP-2020, with flexibility
              to meet industry requirements and
              choice-based subject selection.
            </p>

          </div>

        </div>

      </div>

    </section>


    {/* =============================================
        02 — ABOUT
    ============================================== */}

    <section className="overview-section section-two">

      <div className="card-inner">

        <div className="section-ghost-number">
          02
        </div>

        <div className="card-content">

          <div className="section-number">
            02
          </div>

          <div className="section-content">

            <h3>
              About Us
            </h3>

            <p>
              The Department of Computer Science and
              Engineering at Sanjivani University is
              committed to excellence in education
              and research in full stack development
              with focus on domains such as Computer
              Vision, Machine Learning, Digital Twins
              etc.
            </p>

            <div className="about-grid">

              <div>

                <h4>
                  Programs Offered
                </h4>

                <ul>

                  <li>
                    <strong>
                      Undergraduate:
                    </strong>{' '}
                    B.Tech CSE curriculum powered
                    by HCLTech
                  </li>

                  <li>
                    <strong>
                      Postgraduate:
                    </strong>{' '}
                    M.Tech in CSE
                  </li>

                  <li>
                    <strong>
                      Research:
                    </strong>{' '}
                    Ph.D. in CSE
                  </li>

                </ul>

              </div>


              <div>

                <h4>
                  Features
                </h4>

                <ul>

                  <li>
                    <strong>
                      HCLTech-Powered Syllabus
                    </strong>{' '}
                    – Industry-aligned curriculum
                    with real-world exposure
                  </li>

                  <li>
                    <strong>
                      Advanced Labs
                    </strong>{' '}
                    – High-performance GPUs,
                    Computer Vision Lab, Data Science
                    & Analytics Lab, Robotics &
                    Automation Lab
                  </li>

                  <li>
                    <strong>
                      Industry Collaborations
                    </strong>{' '}
                    – MOUs with leading organizations
                    including HCLTech
                  </li>

                  <li>
                    <strong>
                      Student Activities
                    </strong>{' '}
                    – ACSES, Hackathons, Workshops,
                    International Expert Sessions,
                    Industry Visits
                  </li>

                </ul>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>


    {/* =============================================
        03 — VISION
    ============================================== */}

    <section
      className="overview-section section-three"
      id="vision"
    >

      <div className="card-inner">

        <div className="section-ghost-number">
          03
        </div>

        <div className="card-content">

          <div className="section-number">
            03
          </div>

          <div className="section-content">

            <h3>
              Vision
            </h3>

            <p>
              To achieve global recognition in the
              field of computer science and engineering
              department through innovative curriculum
              and quality in Education, Research,
              Innovation and Entrepreneurship to
              produce effective leaders for serving
              the societal challenges.
            </p>

          </div>

        </div>

      </div>

    </section>


    {/* =============================================
        04 — MISSION
    ============================================== */}

    <section className="overview-section section-four">

      <div className="card-inner">

        <div className="section-ghost-number">
          04
        </div>

        <div className="card-content">

          <div className="section-number">
            04
          </div>

          <div className="section-content">

            <h3>
              Mission
            </h3>

            <ul className="mission-list">

              <li>
                To provide the platform to become
                industry ready technocrats as a full
                stack developer and a curriculum
                tailored to industry needs, with a
                focus on complex problem-solving
                skills.
              </li>

              <li>
                To impart high quality Experiential
                learning in modern software tools and
                to cater to the real time requirements
                of the industry.
              </li>

              <li>
                To develop quality research with both
                national and international to enhance
                learning and research through research
                ecosystem.
              </li>

              <li>
                To promote a supportive and positive
                community by engaging initiatives that
                contributes to societal well-being and
                fulfils institutional social
                responsibility.
              </li>

            </ul>

          </div>

        </div>

      </div>

    </section>


    {/* =============================================
        05 — PROGRAM OUTCOMES
    ============================================== */}

    <section className="overview-section section-five">

      <div className="card-inner">

        <div className="section-ghost-number">
          05
        </div>

        <div className="card-content">

          <div className="section-number">
            05
          </div>

          <div className="section-content">

            <h3>
              Program Outcomes
            </h3>

            <div className="outcomes-grid">

              <div className="outcomes-column">

                <p>
                  <strong>PO1</strong>
                  Engineering Knowledge
                </p>

                <p>
                  <strong>PO2</strong>
                  Problem Analysis
                </p>

                <p>
                  <strong>PO3</strong>
                  Design/Development of Solutions
                </p>

                <p>
                  <strong>PO4</strong>
                  Conduct investigations of complex
                  problems
                </p>

                <p>
                  <strong>PO5</strong>
                  Modern tool usage
                </p>

                <p>
                  <strong>PO6</strong>
                  The engineer and society
                </p>

              </div>


              <div className="outcomes-column">

                <p>
                  <strong>PO7</strong>
                  Environment and sustainability
                </p>

                <p>
                  <strong>PO8</strong>
                  Ethics
                </p>

                <p>
                  <strong>PO9</strong>
                  Individual and team work
                </p>

                <p>
                  <strong>PO10</strong>
                  Communication
                </p>

                <p>
                  <strong>PO11</strong>
                  Project management and finance
                </p>

                <p>
                  <strong>PO12</strong>
                  Life-long learning
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>

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

    <span>
      02 — Academics
    </span>

    <h2>
      Faculty
    </h2>

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

    <span>
      03 — Students
    </span>

    <h2>
      Student Achievements
    </h2>

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

    <span>
      04 — Campus
    </span>

    <h2>
      Upcoming Events
    </h2>

  </div>

</section>

    </main>
  )
}

export default LandingPage