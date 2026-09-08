import { useState } from 'react'
import './StudentDashboard.css'

import DepartmentSection from './DepartmentSection'
import ProfileSection from './ProfileSection'
import AchievementSection from './AchievementSection'
import LMSSection from './LMSSection'

function StudentDashboard() {
  const [activeModule, setActiveModule] = useState<string | null>(null)

  function openModule(module: string) {
    setActiveModule(module)
  }

  function goBackToDashboard() {
    setActiveModule(null)
  }

  /* =========================
     MODULE HEADER
  ========================= */

  function ModuleHeader() {
    return (
      <>
        <header className="student-header">

          <div className="student-logo">

            <div className="student-logo-icon">
              S
            </div>

            <div>
              <h2>Student Portal</h2>

              <p>
                Computer Science & Engineering
              </p>
            </div>

          </div>

          <div className="student-profile">

            <div className="profile-avatar">
              S
            </div>

            <div>
              <strong>Student</strong>

              <span>
                Student
              </span>
            </div>

          </div>

        </header>

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
     DEPARTMENT
  ========================= */

  if (activeModule === 'department') {
    return (
      <main className="student-dashboard">

        <ModuleHeader />

        <DepartmentSection />

      </main>
    )
  }

  /* =========================
     PROFILE
  ========================= */

  if (activeModule === 'profile') {
    return (
      <main className="student-dashboard">

        <ModuleHeader />

        <ProfileSection />

      </main>
    )
  }

  /* =========================
     ACHIEVEMENTS
  ========================= */

  if (activeModule === 'achievements') {
    return (
      <main className="student-dashboard">

        <ModuleHeader />

        <AchievementSection />

      </main>
    )
  }

  /* =========================
     LMS
  ========================= */

  if (activeModule === 'lms') {
    return (
      <main className="student-dashboard">

        <ModuleHeader />

        <LMSSection />

      </main>
    )
  }

  /* =========================
     MAIN DASHBOARD
  ========================= */

  return (
    <main className="student-dashboard">

      {/* Header */}

      <header className="student-header">

        <div className="student-logo">

          <div className="student-logo-icon">
            S
          </div>

          <div>
            <h2>Student Portal</h2>

            <p>
              Computer Science & Engineering
            </p>
          </div>

        </div>

        <div className="student-profile">

          <div className="profile-avatar">
            S
          </div>

          <div>
            <strong>Student</strong>

            <span>
              Student
            </span>
          </div>

        </div>

      </header>


      {/* Welcome Section */}

      <section className="student-welcome">

        <div>

          <p className="welcome-label">
            STUDENT DASHBOARD
          </p>

          <h1>
            Welcome back, Student
          </h1>

          <p>
            Access your department information, academic resources,
            achievements and AI assistance from one place.
          </p>

        </div>

      </section>


      {/* Dashboard Modules */}

      <section className="dashboard-grid">


        {/* Department */}

        <div className="dashboard-card">

          <div className="card-icon">
            01
          </div>

          <h3>
            Department
          </h3>

          <p>
            View department information, programs and facilities.
          </p>

          <button
            onClick={() => openModule('department')}
          >
            View Department
          </button>

        </div>


        {/* Faculty */}

        <div className="dashboard-card">

          <div className="card-icon">
            02
          </div>

          <h3>
            Faculty
          </h3>

          <p>
            View faculty members and their information.
          </p>

          <button
            onClick={() => openModule('faculty')}
          >
            View Faculty
          </button>

        </div>


        {/* Labs */}

        <div className="dashboard-card">

          <div className="card-icon">
            03
          </div>

          <h3>
            Labs
          </h3>

          <p>
            Explore available laboratories and facilities.
          </p>

          <button
            onClick={() => openModule('labs')}
          >
            View Labs
          </button>

        </div>


        {/* Events */}

        <div className="dashboard-card">

          <div className="card-icon">
            04
          </div>

          <h3>
            Events
          </h3>

          <p>
            Check upcoming college and department events.
          </p>

          <button
            onClick={() => openModule('events')}
          >
            View Events
          </button>

        </div>


        {/* Announcements */}

        <div className="dashboard-card">

          <div className="card-icon">
            05
          </div>

          <h3>
            Announcements
          </h3>

          <p>
            Stay updated with important announcements.
          </p>

          <button
            onClick={() => openModule('announcements')}
          >
            View Announcements
          </button>

        </div>


        {/* Profile */}

        <div className="dashboard-card">

          <div className="card-icon">
            06
          </div>

          <h3>
            My Profile
          </h3>

          <p>
            View and manage your student profile.
          </p>

          <button
            onClick={() => openModule('profile')}
          >
            View Profile
          </button>

        </div>


        {/* Achievements */}

        <div className="dashboard-card">

          <div className="card-icon">
            07
          </div>

          <h3>
            Achievements
          </h3>

          <p>
            Add and view your academic and extracurricular achievements.
          </p>

          <button
            onClick={() => openModule('achievements')}
          >
            My Achievements
          </button>

        </div>


        {/* AI Agent */}

        <div className="dashboard-card ai-card">

          <div className="card-icon">
            08
          </div>

          <h3>
            AI Agent
          </h3>

          <p>
            Ask questions and get AI-powered assistance.
          </p>

          <button
            onClick={() => openModule('ai-agent')}
          >
            Ask AI
          </button>

        </div>


        {/* AI Achievement Assistant */}

        <div className="dashboard-card ai-card">

          <div className="card-icon">
            09
          </div>

          <h3>
            AI Achievement Assistant
          </h3>

          <p>
            Get AI assistance to create and improve your achievements.
          </p>

          <button
            onClick={() => openModule('ai-achievement')}
          >
            Get AI Assistance
          </button>

        </div>


        {/* LMS */}

        <div className="dashboard-card">

          <div className="card-icon">
            10
          </div>

          <h3>
            LMS / Dashboard
          </h3>

          <p>
            Access permitted academic and LMS information.
          </p>

          <button
            onClick={() => openModule('lms')}
          >
            Open LMS
          </button>

        </div>

      </section>

    </main>
  )
}

export default StudentDashboard