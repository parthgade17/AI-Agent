import { useState } from 'react'
import './AchievementSection.css'

interface Achievement {
  id: number
  title: string
  category: string
  date: string
  description: string
}

function AchievementSection() {
  const [showForm, setShowForm] = useState(false)

  const [achievements, setAchievements] = useState<Achievement[]>([])

  const [formData, setFormData] = useState({
    title: '',
    category: 'Academic',
    date: '',
    description: '',
  })

  function handleChange(
    field: keyof typeof formData,
    value: string
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleAddAchievement() {
    if (!formData.title.trim()) {
      alert('Please enter achievement title.')
      return
    }

    if (!formData.date) {
      alert('Please select the achievement date.')
      return
    }

    if (!formData.description.trim()) {
      alert('Please enter a description.')
      return
    }

    const newAchievement: Achievement = {
      id: Date.now(),
      title: formData.title,
      category: formData.category,
      date: formData.date,
      description: formData.description,
    }

    setAchievements((current) => [
      newAchievement,
      ...current,
    ])

    setFormData({
      title: '',
      category: 'Academic',
      date: '',
      description: '',
    })

    setShowForm(false)
  }

  function handleDeleteAchievement(id: number) {
    setAchievements((current) =>
      current.filter((achievement) => achievement.id !== id)
    )
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

      {/* Add Achievement Form */}
      {showForm && (
        <div className="achievement-form">

          <div className="achievement-form-header">
            <div>
              <span>NEW ACHIEVEMENT</span>

              <h3>Add Achievement</h3>

              <p>
                Enter the details of your achievement below.
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
                onChange={(event) =>
                  handleChange('title', event.target.value)
                }
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
                onChange={(event) =>
                  handleChange('category', event.target.value)
                }
              >
                <option>Academic</option>
                <option>Technical</option>
                <option>Sports</option>
                <option>Cultural</option>
                <option>Leadership</option>
                <option>Certification</option>
                <option>Other</option>
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
                onChange={(event) =>
                  handleChange('date', event.target.value)
                }
              />
            </div>

            <div className="achievement-field achievement-field-full">
              <label htmlFor="achievement-description">
                Description
              </label>

              <textarea
                id="achievement-description"
                value={formData.description}
                onChange={(event) =>
                  handleChange(
                    'description',
                    event.target.value
                  )
                }
                placeholder="Describe your achievement..."
                rows={5}
              />
            </div>

          </div>

          <div className="achievement-form-actions">

            <button
              className="achievement-cancel-button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>

            <button
              className="achievement-save-button"
              onClick={handleAddAchievement}
            >
              Save Achievement
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

            <button
              onClick={() => setShowForm(true)}
            >
              Add Your First Achievement
            </button>

          </div>
        ) : (
          achievements.map((achievement, index) => (
            <article
              className="achievement-card"
              key={achievement.id}
            >

              <div className="achievement-card-top">

                <span className="achievement-card-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="achievement-category">
                  {achievement.category}
                </span>

              </div>

              <h3>{achievement.title}</h3>

              <span className="achievement-date">
                {achievement.date}
              </span>

              <p>
                {achievement.description}
              </p>

              <button
                className="achievement-delete-button"
                onClick={() =>
                  handleDeleteAchievement(achievement.id)
                }
              >
                Remove Achievement
              </button>

            </article>
          ))
        )}

      </div>

    </section>
  )
}

export default AchievementSection