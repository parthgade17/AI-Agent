import './LMSSection.css'

function LMSSection() {
  return (
    <section className="lms-section">

      {/* LMS Header */}
      <div className="lms-section-header">
        <div>
          <span className="lms-section-label">
            10 · LMS / ACADEMICS
          </span>

          <h2>Learning Management System</h2>

          <p>
            Access your courses, study materials, assignments and
            academic information from one place.
          </p>
        </div>
      </div>

      {/* LMS Overview */}
      <div className="lms-overview">

        <div className="lms-overview-content">
          <span className="lms-overview-label">
            CURRENT SEMESTER
          </span>

          <h3>Semester 5</h3>

          <p>
            Manage your academic resources and keep track of your
            learning activities.
          </p>
        </div>

        <div className="lms-semester-badge">
          2026
        </div>

      </div>

      {/* LMS Modules */}
      <div className="lms-module-grid">

        {/* Courses */}
        <div className="lms-card">

          <span className="lms-card-number">
            01
          </span>

          <h3>My Courses</h3>

          <p>
            View the subjects and courses enrolled in your current
            semester.
          </p>

          <div className="lms-course-list">

            <div className="lms-course-item">
              <strong>Data Structures</strong>
              <span>Computer Science</span>
            </div>

            <div className="lms-course-item">
              <strong>Database Management</strong>
              <span>Computer Science</span>
            </div>

            <div className="lms-course-item">
              <strong>Operating Systems</strong>
              <span>Computer Science</span>
            </div>

          </div>

        </div>

        {/* Assignments */}
        <div className="lms-card">

          <span className="lms-card-number">
            02
          </span>

          <h3>Assignments</h3>

          <p>
            Keep track of assignments and upcoming academic
            submissions.
          </p>

          <div className="lms-status-list">

            <div className="lms-status-item">
              <span>Pending</span>
              <strong>03</strong>
            </div>

            <div className="lms-status-item">
              <span>Submitted</span>
              <strong>08</strong>
            </div>

            <div className="lms-status-item">
              <span>Completed</span>
              <strong>12</strong>
            </div>

          </div>

        </div>

        {/* Study Materials */}
        <div className="lms-card">

          <span className="lms-card-number">
            03
          </span>

          <h3>Study Materials</h3>

          <p>
            Access lecture notes, presentations, documents and
            other learning resources.
          </p>

          <button className="lms-card-button">
            View Materials
          </button>

        </div>

        {/* Attendance */}
        <div className="lms-card">

          <span className="lms-card-number">
            04
          </span>

          <h3>Attendance</h3>

          <p>
            Monitor your academic attendance across your current
            courses.
          </p>

          <div className="lms-attendance">

            <div className="lms-attendance-value">
              86%
            </div>

            <span>
              Overall Attendance
            </span>

          </div>

        </div>

        {/* Academic Activities */}
        <div className="lms-card lms-card-wide">

          <span className="lms-card-number">
            05
          </span>

          <h3>Upcoming Academic Activities</h3>

          <p>
            Stay updated with upcoming academic tasks and
            activities.
          </p>

          <div className="lms-activity-list">

            <div className="lms-activity-item">
              <div>
                <strong>Data Structures Assignment</strong>
                <span>Submission deadline</span>
              </div>

              <small>
                15 Sep
              </small>
            </div>

            <div className="lms-activity-item">
              <div>
                <strong>Database Management Test</strong>
                <span>Internal assessment</span>
              </div>

              <small>
                18 Sep
              </small>
            </div>

            <div className="lms-activity-item">
              <div>
                <strong>Operating Systems Project</strong>
                <span>Project submission</span>
              </div>

              <small>
                22 Sep
              </small>
            </div>

          </div>

        </div>

        {/* LMS Access */}
        <div className="lms-card lms-access-card">

          <span className="lms-card-number">
            06
          </span>

          <h3>External LMS Access</h3>

          <p>
            Open the college LMS platform to access your complete
            academic resources.
          </p>

          <button className="lms-primary-button">
            Open LMS
          </button>

        </div>

      </div>

    </section>
  )
}

export default LMSSection