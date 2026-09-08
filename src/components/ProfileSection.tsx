import { useState } from 'react'
import './ProfileSection.css'

interface StudentProfile {
  name: string
  email: string
  mobile: string
  studentId: string
  department: string
  course: string
  year: string
  division: string
}

function ProfileSection() {
  const [isEditing, setIsEditing] = useState(false)

  const [profile, setProfile] = useState<StudentProfile>({
    name: 'Student',
    email: 'student@sanjivani.edu.in',
    mobile: 'Not provided',
    studentId: 'STU001',
    department: 'Computer Science & Engineering',
    course: 'B.Tech Computer Science & Engineering',
    year: 'Third Year',
    division: 'A',
  })

  const [editedProfile, setEditedProfile] = useState(profile)

  function handleEdit() {
    setEditedProfile(profile)
    setIsEditing(true)
  }

  function handleCancel() {
    setEditedProfile(profile)
    setIsEditing(false)
  }

  function handleChange(
    field: keyof StudentProfile,
    value: string
  ) {
    setEditedProfile((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSave() {
    if (!editedProfile.name.trim()) {
      alert('Please enter your name.')
      return
    }

    if (!editedProfile.email.trim()) {
      alert('Please enter your email.')
      return
    }

    setProfile(editedProfile)
    setIsEditing(false)
  }

  return (
    <section className="profile-section">

      {/* Page Header */}
      <div className="profile-section-header">
        <div>
          <span className="profile-section-label">
            06 · MY PROFILE
          </span>

          <h2>Student Profile</h2>

          <p>
            View and manage your personal and academic information.
          </p>
        </div>

        {!isEditing && (
          <button
            className="profile-edit-button"
            onClick={handleEdit}
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Overview */}
      <div className="profile-overview">

        <div className="profile-avatar-large">
          {profile.name.charAt(0).toUpperCase()}
        </div>

        <div className="profile-overview-content">
          <h3>{profile.name}</h3>

          <p>{profile.course}</p>

          <span>
            Student ID: {profile.studentId}
          </span>
        </div>

      </div>

      {/* Edit Form */}
      {isEditing ? (
        <div className="profile-form">

          <div className="profile-form-header">
            <div>
              <h3>Edit Profile</h3>

              <p>
                Update your information and save your changes.
              </p>
            </div>
          </div>

          <div className="profile-form-grid">

            {/* Name */}
            <div className="profile-field">
              <label htmlFor="profile-name">
                Full Name
              </label>

              <input
                id="profile-name"
                type="text"
                value={editedProfile.name}
                onChange={(event) =>
                  handleChange('name', event.target.value)
                }
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div className="profile-field">
              <label htmlFor="profile-email">
                Email Address
              </label>

              <input
                id="profile-email"
                type="email"
                value={editedProfile.email}
                onChange={(event) =>
                  handleChange('email', event.target.value)
                }
                placeholder="Enter your email"
              />
            </div>

            {/* Mobile */}
            <div className="profile-field">
              <label htmlFor="profile-mobile">
                Mobile Number
              </label>

              <input
                id="profile-mobile"
                type="tel"
                value={editedProfile.mobile}
                onChange={(event) =>
                  handleChange('mobile', event.target.value)
                }
                placeholder="Enter your mobile number"
              />
            </div>

            {/* Student ID */}
            <div className="profile-field">
              <label htmlFor="profile-student-id">
                Student ID
              </label>

              <input
                id="profile-student-id"
                type="text"
                value={editedProfile.studentId}
                disabled
              />

              <small>
                Student ID cannot be changed.
              </small>
            </div>

            {/* Department */}
            <div className="profile-field profile-field-full">
              <label htmlFor="profile-department">
                Department
              </label>

              <input
                id="profile-department"
                type="text"
                value={editedProfile.department}
                disabled
              />

              <small>
                Department is managed by the college.
              </small>
            </div>

            {/* Course */}
            <div className="profile-field">
              <label htmlFor="profile-course">
                Course
              </label>

              <input
                id="profile-course"
                type="text"
                value={editedProfile.course}
                onChange={(event) =>
                  handleChange('course', event.target.value)
                }
                placeholder="Enter your course"
              />
            </div>

            {/* Year */}
            <div className="profile-field">
              <label htmlFor="profile-year">
                Academic Year
              </label>

              <select
                id="profile-year"
                value={editedProfile.year}
                onChange={(event) =>
                  handleChange('year', event.target.value)
                }
              >
                <option>First Year</option>
                <option>Second Year</option>
                <option>Third Year</option>
                <option>Fourth Year</option>
              </select>
            </div>

            {/* Division */}
            <div className="profile-field">
              <label htmlFor="profile-division">
                Division
              </label>

              <input
                id="profile-division"
                type="text"
                value={editedProfile.division}
                onChange={(event) =>
                  handleChange('division', event.target.value)
                }
                placeholder="Enter division"
              />
            </div>

          </div>

          {/* Form Actions */}
          <div className="profile-form-actions">

            <button
              className="profile-cancel-button"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <button
              className="profile-save-button"
              onClick={handleSave}
            >
              Save Changes
            </button>

          </div>

        </div>
      ) : (

        /* Profile Information */
        <div className="profile-information-grid">

          <div className="profile-information-card">
            <span className="profile-card-number">01</span>

            <h3>Personal Information</h3>

            <div className="profile-detail">
              <span>Full Name</span>
              <strong>{profile.name}</strong>
            </div>

            <div className="profile-detail">
              <span>Email</span>
              <strong>{profile.email}</strong>
            </div>

            <div className="profile-detail">
              <span>Mobile</span>
              <strong>{profile.mobile}</strong>
            </div>
          </div>

          <div className="profile-information-card">
            <span className="profile-card-number">02</span>

            <h3>Academic Information</h3>

            <div className="profile-detail">
              <span>Student ID</span>
              <strong>{profile.studentId}</strong>
            </div>

            <div className="profile-detail">
              <span>Department</span>
              <strong>{profile.department}</strong>
            </div>

            <div className="profile-detail">
              <span>Course</span>
              <strong>{profile.course}</strong>
            </div>

            <div className="profile-detail">
              <span>Year</span>
              <strong>{profile.year}</strong>
            </div>

            <div className="profile-detail">
              <span>Division</span>
              <strong>{profile.division}</strong>
            </div>
          </div>

        </div>
      )}

    </section>
  )
}

export default ProfileSection