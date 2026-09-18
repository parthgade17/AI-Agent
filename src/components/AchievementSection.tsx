import { useEffect, useState } from 'react'
import { studentApi } from '../api'
import type { StudentAchievement } from '../api'
import './AchievementSection.css'

interface Props {
  token: string
}

// Display labels shown in the dropdown, mapped to the exact lowercase values
// the backend's CHECK constraint requires (student_routes.py CATEGORIES).
// The old version of this form sent "Academic", "Technical" etc. straight
// to the database, which never matched and would have failed outright the
// moment this component was actually wired to the API.
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'competition', label: 'Competition' },
  { value: 'coding', label: 'Coding' },
  { value: 'sports', label: 'Sports' },
  { value: 'research', label: 'Research' },
  { value: 'certification', label: 'Certification' },
  { value: 'internship', label: 'Internship' },
  { value: 'placement', label: 'Placement' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'academic', label: 'Academic' },
  { value: 'other', label: 'Other' },
]

function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value
}

function statusLabel(a: StudentAchievement): string {
  if (a.is_published) return 'Published'
  if (a.verified_at) return 'Verified — awaiting publish'
  return 'Pending HOD approval'
}

function AchievementSection({ token }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [achievements, setAchievements] = useState<StudentAchievement[]>([])
  const [loadError, setLoadError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [certFile, setCertFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    category: 'academic',
    date: '',
    description: '',
    event_name: '',
    organiser: '',
    position: '',
  })

  const load = () => {
    studentApi.achievements(token).then(setAchievements).catch((e) => setLoadError(e.message))
  }

  useEffect(load, [token])

  function handleChange(field: keyof typeof formData, value: string) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  async function handleAddAchievement() {
    if (!formData.title.trim()) {
      setFormMessage('Please enter an achievement title.')
      return
    }
    if (!formData.date) {
      setFormMessage('Please select the achievement date.')
      return
    }
    if (!formData.description.trim()) {
      setFormMessage('Please enter a description.')
      return
    }

    setSaving(true)
    setFormMessage('')

    try {
      const created = await studentApi.addAchievement(token, {
        title: formData.title,
        category: formData.category,
        description: formData.description,
        event_name: formData.event_name || null,
        organiser: formData.organiser || null,
        position: formData.position || null,
        achieved_on: formData.date,
      })

      let message = 'Achievement submitted — it will appear once the HOD approves it.'

      if (certFile) {
        try {
          await studentApi.uploadCertificate(token, created.id, certFile)
        } catch (e) {
          message = `Achievement submitted, but the certificate upload failed: ${
            e instanceof Error ? e.message : 'unknown error'
          }`
        }
      }

      setFormMessage(message)
      setFormData({
        title: '',
        category: 'academic',
        date: '',
        description: '',
        event_name: '',
        organiser: '',
        position: '',
      })
      setCertFile(null)
      setShowForm(false)
      load()
    } catch (e) {
      setFormMessage(e instanceof Error ? e.message : 'Could not save achievement')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAchievement(id: number) {
    try {
      await studentApi.deleteAchievement(token, id)
      load()
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not delete achievement')
    }
  }

  function shareOnLinkedIn(url: string) {
    // LinkedIn's share endpoint takes only a URL -- it builds its own
    // preview card by reading the Open Graph tags on that page (see
    // public_routes.py's /achievements/{id}/preview) and the student types
    // their own caption in LinkedIn's dialog. No login to your app is
    // needed for this, and no LinkedIn app approval either.
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="achievement-section">

      {/* Header */}
      <div className="achievement-section-header">

        <div>
          <span className="achievement-section-label">
            07 · ACHIEVEMENTS
          </span>

          <h2>My Achievements</h2>

          <p>
            Add, manage and showcase your academic,
            technical and extracurricular achievements.
          </p>
        </div>

        <button
          className="achievement-add-button"
          onClick={() => setShowForm((current) => !current)}
        >
          {showForm ? 'Close Form' : 'Add Achievement'}
        </button>

      </div>

      {loadError && <p className="achievement-error">{loadError}</p>}

      {/* Add Achievement Form */}
      {showForm && (
        <div className="achievement-form">

          <div className="achievement-form-header">
            <div>
              <span>NEW ACHIEVEMENT</span>

              <h3>Add Achievement</h3>

              <p>
                Enter the details below. It will be sent to the HOD for
                approval before it appears on the department site.
              </p>
            </div>
          </div>

          <div className="achievement-form-grid">

            <div className="achievement-field">
              <label htmlFor="achievement-title">
                Achievement Title
              </label>

              <input
                id="achievement-title"
                type="text"
                value={formData.title}
                onChange={(event) => handleChange('title', event.target.value)}
                placeholder="e.g. First Prize in Coding Competition"
              />
            </div>

            <div className="achievement-field">
              <label htmlFor="achievement-category">
                Category
              </label>

              <select
                id="achievement-category"
                value={formData.category}
                onChange={(event) => handleChange('category', event.target.value)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="achievement-field">
              <label htmlFor="achievement-date">
                Achievement Date
              </label>

              <input
                id="achievement-date"
                type="date"
                value={formData.date}
                onChange={(event) => handleChange('date', event.target.value)}
              />
            </div>

            <div className="achievement-field">
              <label htmlFor="achievement-event">
                Event name (optional)
              </label>

              <input
                id="achievement-event"
                type="text"
                value={formData.event_name}
                onChange={(event) => handleChange('event_name', event.target.value)}
                placeholder="e.g. Smart India Hackathon"
              />
            </div>

            <div className="achievement-field">
              <label htmlFor="achievement-organiser">
                Organiser (optional)
              </label>

              <input
                id="achievement-organiser"
                type="text"
                value={formData.organiser}
                onChange={(event) => handleChange('organiser', event.target.value)}
              />
            </div>

            <div className="achievement-field">
              <label htmlFor="achievement-position">
                Position / result (optional)
              </label>

              <input
                id="achievement-position"
                type="text"
                value={formData.position}
                onChange={(event) => handleChange('position', event.target.value)}
                placeholder="e.g. Winner, 1st Runner-up"
              />
            </div>

            <div className="achievement-field achievement-field-full">
              <label htmlFor="achievement-description">
                Description
              </label>

              <textarea
                id="achievement-description"
                value={formData.description}
                onChange={(event) => handleChange('description', event.target.value)}
                placeholder="Describe your achievement..."
                rows={5}
              />
            </div>

            <div className="achievement-field achievement-field-full">
              <label htmlFor="achievement-cert">
                Certificate or photo (optional)
              </label>

              <input
                id="achievement-cert"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(event) => setCertFile(event.target.files?.[0] ?? null)}
              />
            </div>

          </div>

          {formMessage && <p className="achievement-form-message">{formMessage}</p>}

          <div className="achievement-form-actions">

            <button
              className="achievement-cancel-button"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className="achievement-save-button"
              onClick={handleAddAchievement}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Achievement'}
            </button>

          </div>

        </div>
      )}

      {/* Achievement List */}
      <div className="achievement-list">

        {achievements.length === 0 ? (
          <div className="achievement-empty-state">

            <span className="achievement-empty-number">
              01
            </span>

            <h3>No achievements added yet</h3>

            <p>
              Start building your achievement profile by
              adding your academic, technical or
              extracurricular achievements.
            </p>

            <button onClick={() => setShowForm(true)}>
              Add Your First Achievement
            </button>

          </div>
        ) : (
          achievements.map((achievement, index) => (
            <article className="achievement-card" key={achievement.id}>

              <div className="achievement-card-top">

                <span className="achievement-card-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="achievement-category">
                  {categoryLabel(achievement.category)}
                </span>

                <span className={`achievement-status achievement-status-${
                  achievement.is_published ? 'published' : 'pending'
                }`}>
                  {statusLabel(achievement)}
                </span>

              </div>

              <h3>{achievement.title}</h3>

              <span className="achievement-date">
                {achievement.achieved_on ?? ''}
              </span>

              <p>{achievement.description}</p>

              {achievement.proof_url && (
                <p className="achievement-proof-link">
                  <a href={achievement.proof_url} target="_blank" rel="noopener noreferrer">
                    View certificate
                  </a>
                </p>
              )}

              <div className="achievement-card-actions">

                {achievement.is_published && achievement.share_url && (
                  <button
                    className="achievement-linkedin-button"
                    onClick={() => shareOnLinkedIn(achievement.share_url as string)}
                  >
                    Share on LinkedIn
                  </button>
                )}

                {!achievement.verified_at && (
                  <button
                    className="achievement-delete-button"
                    onClick={() => handleDeleteAchievement(achievement.id)}
                  >
                    Remove Achievement
                  </button>
                )}

              </div>

            </article>
          ))
        )}

      </div>

    </section>
  )
}

export default AchievementSection