import { useCallback, useEffect, useState } from 'react'
import { studentApi, lmsFiles } from '../api'
import type { LmsDocument, StudentLms } from '../api'
import './LMSSection.css'

const TYPE_LABEL: Record<string, string> = {
  notes: 'Notes',
  assignment: 'Assignment',
  question_bank: 'Question Bank',
  practical_manual: 'Practical Manual',
  circular: 'Circular',
  syllabus: 'Syllabus',
  timetable: 'Timetable',
  other: 'Other',
}

function sizeLabel(kb: number | null) {
  if (!kb) return ''
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

function LMSSection({ token }: { token: string }) {
  const [data, setData] = useState<StudentLms | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback(() => {
    studentApi
      .lms(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load LMS data'))
  }, [token])

  useEffect(load, [load])

  async function handleDownload(doc: LmsDocument) {
    setBusyId(doc.id)
    setError('')
    try {
      const ext = doc.file_type ? `.${doc.file_type}` : ''
      await lmsFiles.download(token, doc.id, `${doc.title}${ext}`)
      load()                      // refresh the download counter
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    }
    setBusyId(null)
  }

  async function handleOpen(doc: LmsDocument) {
    setBusyId(doc.id)
    setError('')
    try {
      await lmsFiles.open(token, doc.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the file')
    }
    setBusyId(null)
  }

  if (!data) {
    return (
      <section className="lms-section">
        <p>{error || 'Loading academic resources…'}</p>
      </section>
    )
  }

  const docs = data.documents ?? []
  const byType = (t: string) => docs.filter((d) => d.doc_type === t)
  const assignments = byType('assignment')
  const notes = byType('notes')
  const questionBanks = byType('question_bank')
  const manuals = byType('practical_manual')

  const visible = filter === 'all' ? docs : docs.filter((d) => d.doc_type === filter)

  const presentTypes = Array.from(new Set(docs.map((d) => d.doc_type)))

  return (
    <section className="lms-section">

      {/* Header */}
      <div className="lms-section-header">
        <div>
          <span className="lms-section-label">10 · LMS / ACADEMICS</span>
          <h2>Learning Management System</h2>
          <p>
            Course materials, assignments and question banks shared by your
            faculty. Open a file in the browser or download it.
          </p>
        </div>
      </div>

      {error && <p className="lms-error">{error}</p>}

      {/* Overview */}
      <div className="lms-overview">
        <div className="lms-overview-content">
          <span className="lms-overview-label">CURRENT SEMESTER</span>
          <h3>
            {data.current_semester ? `Semester ${data.current_semester}` : 'Semester not set'}
          </h3>
          <p>
            {data.subjects.length} subject{data.subjects.length === 1 ? '' : 's'} ·{' '}
            {docs.length} document{docs.length === 1 ? '' : 's'} available for download.
          </p>
        </div>

        <div className="lms-semester-badge">
          {data.current_year ? `Year ${data.current_year}` : '—'}
        </div>
      </div>

      {/* Modules */}
      <div className="lms-module-grid">

        {/* Subjects */}
        <div className="lms-card">
          <span className="lms-card-number">01</span>
          <h3>My Subjects</h3>
          <p>The subjects on your current semester.</p>

          <div className="lms-course-list">
            {data.subjects.length ? (
              data.subjects.map((s) => (
                <div className="lms-course-item" key={s.id}>
                  <strong>{s.name}</strong>
                  <span>
                    {[s.code, s.faculty_name, s.credits ? `${s.credits} credits` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              ))
            ) : (
              <div className="lms-course-item">
                <strong>No subjects recorded</strong>
                <span>The department office adds these.</span>
              </div>
            )}
          </div>
        </div>

        {/* Counts — real, from the database */}
        <div className="lms-card">
          <span className="lms-card-number">02</span>
          <h3>Materials Available</h3>
          <p>What your faculty have shared so far.</p>

          <div className="lms-status-list">
            <div className="lms-status-item">
              <span>Assignments</span>
              <strong>{String(assignments.length).padStart(2, '0')}</strong>
            </div>
            <div className="lms-status-item">
              <span>Notes</span>
              <strong>{String(notes.length).padStart(2, '0')}</strong>
            </div>
            <div className="lms-status-item">
              <span>Question banks</span>
              <strong>{String(questionBanks.length).padStart(2, '0')}</strong>
            </div>
            <div className="lms-status-item">
              <span>Practical manuals</span>
              <strong>{String(manuals.length).padStart(2, '0')}</strong>
            </div>
          </div>
        </div>

        {/* All documents, downloadable */}
        <div className="lms-card lms-card-wide">
          <span className="lms-card-number">03</span>
          <h3>Course Materials</h3>
          <p>
            {docs.length
              ? 'Click a file to open it in a new tab, or download it to keep.'
              : 'Nothing has been uploaded yet. Files appear here as faculty add them.'}
          </p>

          {presentTypes.length > 1 && (
            <div className="lms-filter-row">
              <button
                className={filter === 'all' ? 'lms-filter active' : 'lms-filter'}
                onClick={() => setFilter('all')}
              >
                All ({docs.length})
              </button>
              {presentTypes.map((t) => (
                <button
                  key={t}
                  className={filter === t ? 'lms-filter active' : 'lms-filter'}
                  onClick={() => setFilter(t)}
                >
                  {TYPE_LABEL[t] ?? t} ({byType(t).length})
                </button>
              ))}
            </div>
          )}

          <div className="lms-activity-list">
            {visible.map((d) => (
              <div className="lms-activity-item lms-file-item" key={d.id}>
                <div>
                  <strong>{d.title}</strong>
                  <span>
                    {[
                      TYPE_LABEL[d.doc_type] ?? d.doc_type,
                      d.subject_name,
                      d.unit_number ? `Unit ${d.unit_number}` : null,
                      sizeLabel(d.file_size_kb),
                      d.file_type?.toUpperCase(),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="lms-file-meta">
                    Uploaded by {d.uploaded_by_name} on{' '}
                    {new Date(d.uploaded_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    {d.download_count > 0 && ` · ${d.download_count} download${d.download_count === 1 ? '' : 's'}`}
                  </span>
                  {d.description && <span className="lms-file-meta">{d.description}</span>}
                </div>

                <div className="lms-file-actions">
                  <button
                    className="lms-card-button"
                    disabled={busyId === d.id}
                    onClick={() => handleOpen(d)}
                  >
                    Open
                  </button>
                  <button
                    className="lms-primary-button"
                    disabled={busyId === d.id}
                    onClick={() => handleDownload(d)}
                  >
                    {busyId === d.id ? '…' : 'Download'}
                  </button>
                </div>
              </div>
            ))}

            {!visible.length && (
              <div className="lms-activity-item">
                <div>
                  <strong>Nothing here yet</strong>
                  <span>Documents appear as faculty upload them.</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  )
}

export default LMSSection