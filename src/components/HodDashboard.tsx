import { useCallback, useEffect, useState } from 'react'
import { hodApi } from '../api'
import type {
  Draft, EventRow, FacultyRow, HodProfile, HodStats,
  LmsRow, Session, StudentOption, SubjectOption,
} from '../api'
import './HodDashboard.css'

type Tab = 'dashboard' | 'profile' | 'approvals' | 'achievements' | 'events' | 'lms' | 'faculty'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profile', label: 'My Profile' },
  { id: 'approvals', label: 'Message Approvals' },
  { id: 'achievements', label: 'Add Achievement' },
  { id: 'events', label: 'Add Event' },
  { id: 'lms', label: 'LMS Documents' },
  { id: 'faculty', label: 'Faculty' },
]

function Banner({ kind, text }: { kind: 'ok' | 'err'; text: string }) {
  if (!text) return null
  return <div className={`hod-banner hod-banner-${kind}`}>{text}</div>
}

/* ------------------------------------------------------------- 1. PROFILE */

function ProfilePanel({ token }: { token: string }) {
  const [p, setP] = useState<HodProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState({ kind: 'ok' as 'ok' | 'err', text: '' })

  const load = useCallback(() => {
    hodApi.profile(token).then(setP).catch((e) => setMsg({ kind: 'err', text: e.message }))
  }, [token])

  useEffect(load, [load])

  function startEdit() {
    if (!p) return
    setForm({
      name: p.name ?? '', mobile: p.mobile ?? '', designation: p.designation ?? '',
      qualification: p.qualification ?? '', specialization: p.specialization ?? '',
      research_areas: p.research_areas ?? '',
      experience_years: p.experience_years?.toString() ?? '',
      office_location: p.office_location ?? '', available_hours: p.available_hours ?? '',
    })
    setEditing(true)
  }

  async function save() {
    try {
      const payload: Record<string, unknown> = { ...form }
      payload.experience_years = form.experience_years ? Number(form.experience_years) : null
      setP(await hodApi.saveProfile(token, payload))
      setEditing(false)
      setMsg({ kind: 'ok', text: 'Profile updated.' })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Could not save' })
    }
  }

  if (!p) return <p className="hod-muted">Loading profile…</p>

  const field = (k: string, label: string, area = false) => (
    <div className="hod-field" key={k}>
      <label>{label}</label>
      {area ? (
        <textarea rows={3} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      ) : (
        <input value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      )}
    </div>
  )

  return (
    <div>
      <Banner kind={msg.kind} text={msg.text} />

      <div className="hod-profile-head">
        <div className="hod-avatar">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
        <div>
          <h3>{p.name}</h3>
          <p className="hod-muted">{p.designation} · {p.department_name}</p>
          <p className="hod-muted hod-small">{p.email}{p.mobile ? ` · ${p.mobile}` : ''}</p>
        </div>
        {!editing && <button className="hod-btn-ghost" onClick={startEdit}>Edit</button>}
      </div>

      {editing ? (
        <div className="hod-form">
          <div className="hod-grid-2">
            {field('name', 'Full name')}
            {field('mobile', 'Mobile')}
            {field('designation', 'Designation')}
            {field('experience_years', 'Experience (years)')}
            {field('office_location', 'Office location')}
            {field('available_hours', 'Available hours')}
          </div>
          {field('qualification', 'Qualification', true)}
          {field('specialization', 'Specialization', true)}
          {field('research_areas', 'Research areas', true)}
          <div className="hod-actions">
            <button className="hod-btn" onClick={save}>Save changes</button>
            <button className="hod-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="hod-readout">
          <div><span>Qualification</span><p>{p.qualification || '—'}</p></div>
          <div><span>Specialization</span><p>{p.specialization || '—'}</p></div>
          <div><span>Research areas</span><p>{p.research_areas || '—'}</p></div>
          <div className="hod-grid-3">
            <div><span>Experience</span><p>{p.experience_years ? `${p.experience_years} years` : '—'}</p></div>
            <div><span>Office</span><p>{p.office_location || '—'}</p></div>
            <div><span>Available</span><p>{p.available_hours || '—'}</p></div>
          </div>
        </div>
      )}

      <h4 className="hod-subhead">Publications and awards ({p.achievements.length})</h4>
      <ul className="hod-list">
        {p.achievements.map((a) => (
          <li key={a.id}>
            <strong>{a.title}</strong>
            <span className="hod-muted hod-small">
              {a.venue || a.category}{a.impact_factor ? ` · IF ${a.impact_factor}` : ''}
            </span>
          </li>
        ))}
        {!p.achievements.length && <li className="hod-muted">None recorded.</li>}
      </ul>

      <h4 className="hod-subhead">Research scholars ({p.scholars.length})</h4>
      <ul className="hod-list hod-list-inline">
        {p.scholars.map((s) => <li key={s.id}>{s.name}</li>)}
        {!p.scholars.length && <li className="hod-muted">None recorded.</li>}
      </ul>
    </div>
  )
}

/* ----------------------------------------------------------- 2. APPROVALS */

function ApprovalsPanel({ token }: { token: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState({ kind: 'ok' as 'ok' | 'err', text: '' })

  const load = useCallback(() => {
    hodApi.drafts(token).then(setDrafts).catch((e) => setMsg({ kind: 'err', text: e.message }))
  }, [token])

  useEffect(load, [load])

  async function act(fn: Promise<unknown>, ok: string) {
    try { await fn; setMsg({ kind: 'ok', text: ok }); setEditId(null); load() }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }) }
  }

  return (
    <div>
      <Banner kind={msg.kind} text={msg.text} />
      <p className="hod-muted hod-small hod-note">
        Every achievement and event you add generates a draft announcement here. Review
        the wording, edit if needed, then approve — approving also publishes the linked
        record to the department page.
      </p>

      {!drafts.length && <p className="hod-muted">No drafts waiting for approval.</p>}

      {drafts.map((d) => (
        <div className="hod-draft" key={d.id}>
          <div className="hod-draft-head">
            <div>
              <strong>{d.title}</strong>
              <span className={`hod-tag hod-tag-${d.ref_type}`}>{d.ref_type}</span>
            </div>
            <span className="hod-muted hod-small">
              {new Date(d.created_at).toLocaleDateString()}
            </span>
          </div>

          {editId === d.id ? (
            <textarea className="hod-draft-edit" rows={9} value={text}
                      onChange={(e) => setText(e.target.value)} />
          ) : (
            <pre className="hod-draft-body">{d.body}</pre>
          )}

          <div className="hod-actions">
            {editId === d.id ? (
              <>
                <button className="hod-btn" onClick={() =>
                  act(hodApi.editDraft(token, d.id, { body: text }), 'Draft updated.')}>
                  Save draft
                </button>
                <button className="hod-btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <button className="hod-btn" onClick={() =>
                  act(hodApi.approve(token, d.id), 'Approved and published.')}>
                  Approve &amp; publish
                </button>
                <button className="hod-btn-ghost"
                        onClick={() => { setEditId(d.id); setText(d.body) }}>
                  Edit
                </button>
                <button className="hod-btn-danger" onClick={() =>
                  act(hodApi.reject(token, d.id), 'Draft rejected.')}>
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------- 3. ACHIEVEMENTS */

const CATEGORIES = ['hackathon', 'competition', 'coding', 'sports', 'research',
  'certification', 'internship', 'placement', 'entrepreneurship', 'academic', 'other']

function AchievementPanel({ token }: { token: string }) {
  const [students, setStudents] = useState<StudentOption[]>([])
  const [f, setF] = useState({
    student_id: '', title: '', category: 'hackathon', event_name: '', organiser: '',
    location: '', position: '', prize_amount: '', achieved_on: '', description: '',
  })
  const [msg, setMsg] = useState({ kind: 'ok' as 'ok' | 'err', text: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    hodApi.students(token).then(setStudents).catch(() => undefined)
  }, [token])

  async function submit() {
    if (!f.student_id || f.title.trim().length < 3) {
      setMsg({ kind: 'err', text: 'Select a student and enter a title.' })
      return
    }
    setBusy(true)
    try {
      await hodApi.addAchievement(token, {
        ...f,
        student_id: Number(f.student_id),
        prize_amount: f.prize_amount ? Number(f.prize_amount) : null,
        achieved_on: f.achieved_on || null,
      })
      setMsg({ kind: 'ok', text: 'Achievement saved. A draft announcement is waiting in Message Approvals.' })
      setF({ ...f, title: '', event_name: '', organiser: '', location: '', position: '', prize_amount: '', description: '' })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Could not save' })
    }
    setBusy(false)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  return (
    <div className="hod-form">
      <Banner kind={msg.kind} text={msg.text} />

      <div className="hod-grid-2">
        <div className="hod-field">
          <label>Student</label>
          <select value={f.student_id} onChange={set('student_id')}>
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.roll_no ? ` — ${s.roll_no}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="hod-field">
          <label>Category</label>
          <select value={f.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="hod-field">
        <label>Achievement title</label>
        <input value={f.title} onChange={set('title')}
               placeholder="First Runner-Up, TechDeviathon 2026" />
      </div>

      <div className="hod-grid-2">
        <div className="hod-field">
          <label>Event name</label>
          <input value={f.event_name} onChange={set('event_name')} />
        </div>
        <div className="hod-field">
          <label>Organiser</label>
          <input value={f.organiser} onChange={set('organiser')} />
        </div>
        <div className="hod-field">
          <label>Position</label>
          <input value={f.position} onChange={set('position')} placeholder="First Prize" />
        </div>
        <div className="hod-field">
          <label>Prize amount (Rs.)</label>
          <input value={f.prize_amount} onChange={set('prize_amount')} inputMode="numeric" />
        </div>
        <div className="hod-field">
          <label>Location</label>
          <input value={f.location} onChange={set('location')} />
        </div>
        <div className="hod-field">
          <label>Date</label>
          <input type="date" value={f.achieved_on} onChange={set('achieved_on')} />
        </div>
      </div>

      <div className="hod-field">
        <label>Description</label>
        <textarea rows={3} value={f.description} onChange={set('description')} />
      </div>

      <button className="hod-btn" onClick={submit} disabled={busy}>
        {busy ? 'Saving…' : 'Save achievement'}
      </button>
    </div>
  )
}

/* --------------------------------------------------------------- 4. EVENTS */

const EVENT_TYPES = ['workshop', 'seminar', 'guest_lecture', 'competition', 'hackathon',
  'industrial_visit', 'cultural', 'sports', 'exhibition', 'other']

function EventsPanel({ token }: { token: string }) {
  const [events, setEvents] = useState<EventRow[]>([])
  const [f, setF] = useState({
    title: '', scope: 'department', event_type: 'workshop', venue: '',
    starts_at: '', ends_at: '', speaker: '', organiser: '',
    registration_link: '', description: '',
  })
  const [msg, setMsg] = useState({ kind: 'ok' as 'ok' | 'err', text: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    hodApi.events(token).then(setEvents).catch(() => undefined)
  }, [token])
  useEffect(load, [load])

  async function submit() {
    if (f.title.trim().length < 3 || !f.starts_at) {
      setMsg({ kind: 'err', text: 'Enter a title and a start date and time.' })
      return
    }
    setBusy(true)
    try {
      await hodApi.addEvent(token, { ...f, ends_at: f.ends_at || null })
      setMsg({ kind: 'ok', text: 'Event saved. A draft announcement is waiting in Message Approvals.' })
      setF({ ...f, title: '', venue: '', starts_at: '', ends_at: '', speaker: '', registration_link: '', description: '' })
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Could not save' })
    }
    setBusy(false)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  return (
    <div>
      <Banner kind={msg.kind} text={msg.text} />

      <div className="hod-form">
        <div className="hod-field">
          <label>Event level</label>
          <div className="hod-scope">
            <button className={f.scope === 'institute' ? 'active' : ''}
                    onClick={() => setF({ ...f, scope: 'institute' })}>
              College level
              <span>Open to the whole university</span>
            </button>
            <button className={f.scope === 'department' ? 'active' : ''}
                    onClick={() => setF({ ...f, scope: 'department' })}>
              Department level
              <span>CSE department only</span>
            </button>
          </div>
        </div>

        <div className="hod-field">
          <label>Event title</label>
          <input value={f.title} onChange={set('title')}
                 placeholder="Workshop on Generative AI" />
        </div>

        <div className="hod-grid-2">
          <div className="hod-field">
            <label>Type</label>
            <select value={f.event_type} onChange={set('event_type')}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="hod-field">
            <label>Venue</label>
            <input value={f.venue} onChange={set('venue')} placeholder="Seminar Hall" />
          </div>
          <div className="hod-field">
            <label>Starts at</label>
            <input type="datetime-local" value={f.starts_at} onChange={set('starts_at')} />
          </div>
          <div className="hod-field">
            <label>Ends at</label>
            <input type="datetime-local" value={f.ends_at} onChange={set('ends_at')} />
          </div>
          <div className="hod-field">
            <label>Speaker</label>
            <input value={f.speaker} onChange={set('speaker')} />
          </div>
          <div className="hod-field">
            <label>Organiser</label>
            <input value={f.organiser} onChange={set('organiser')} />
          </div>
        </div>

        <div className="hod-field">
          <label>Registration link</label>
          <input value={f.registration_link} onChange={set('registration_link')} />
        </div>

        <div className="hod-field">
          <label>Description</label>
          <textarea rows={3} value={f.description} onChange={set('description')} />
        </div>

        <button className="hod-btn" onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save event'}
        </button>
      </div>

      <h4 className="hod-subhead">All events ({events.length})</h4>
      <table className="hod-table">
        <thead>
          <tr><th>Title</th><th>Level</th><th>Starts</th><th>Venue</th><th>Status</th></tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{e.title}</td>
              <td><span className={`hod-tag hod-tag-${e.scope}`}>
                {e.scope === 'institute' ? 'College' : 'Department'}
              </span></td>
              <td>{new Date(e.starts_at).toLocaleString()}</td>
              <td>{e.venue || '—'}</td>
              <td>{e.is_published
                ? <span className="hod-pill hod-pill-ok">Published</span>
                : <span className="hod-pill">Draft</span>}</td>
            </tr>
          ))}
          {!events.length && (
            <tr><td colSpan={5} className="hod-muted">No events yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ 5. LMS */

const DOC_TYPES = ['notes', 'assignment', 'question_bank', 'practical_manual',
  'circular', 'syllabus', 'timetable', 'other']

function LmsPanel({ token }: { token: string }) {
  const [docs, setDocs] = useState<LmsRow[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ title: '', doc_type: 'notes', subject_id: '', semester: '', description: '' })
  const [msg, setMsg] = useState({ kind: 'ok' as 'ok' | 'err', text: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    hodApi.lms(token).then(setDocs).catch(() => undefined)
    hodApi.subjects(token).then(setSubjects).catch(() => undefined)
  }, [token])
  useEffect(load, [load])

  async function upload() {
    if (!file || !f.title.trim()) {
      setMsg({ kind: 'err', text: 'Choose a file and enter a title.' })
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', f.title)
      fd.append('doc_type', f.doc_type)
      if (f.subject_id) fd.append('subject_id', f.subject_id)
      if (f.semester) fd.append('semester', f.semester)
      if (f.description) fd.append('description', f.description)
      await hodApi.uploadLms(token, fd)
      setMsg({ kind: 'ok', text: 'Document uploaded.' })
      setF({ ...f, title: '', description: '' })
      setFile(null)
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Upload failed' })
    }
    setBusy(false)
  }

  async function remove(id: number) {
    try { await hodApi.deleteLms(token, id); load() }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Delete failed' }) }
  }

  return (
    <div>
      <Banner kind={msg.kind} text={msg.text} />

      <div className="hod-form">
        <div className="hod-field">
          <label>File</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                 accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" />
          <span className="hod-muted hod-small">PDF, Word, PowerPoint, Excel, text or zip. Up to 25 MB.</span>
        </div>

        <div className="hod-field">
          <label>Title</label>
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
                 placeholder="DBMS Unit 3 Notes" />
        </div>

        <div className="hod-grid-3">
          <div className="hod-field">
            <label>Document type</label>
            <select value={f.doc_type} onChange={(e) => setF({ ...f, doc_type: e.target.value })}>
              {DOC_TYPES.map((d) => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="hod-field">
            <label>Subject</label>
            <select value={f.subject_id} onChange={(e) => setF({ ...f, subject_id: e.target.value })}>
              <option value="">Not subject-specific</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </div>
          <div className="hod-field">
            <label>Semester</label>
            <select value={f.semester} onChange={(e) => setF({ ...f, semester: e.target.value })}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <button className="hod-btn" onClick={upload} disabled={busy}>
          {busy ? 'Uploading…' : 'Upload document'}
        </button>
      </div>

      <h4 className="hod-subhead">Uploaded documents ({docs.length})</h4>
      <table className="hod-table">
        <thead>
          <tr><th>Title</th><th>Type</th><th>Subject</th><th>Size</th><th>Indexed</th><th></th></tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>{d.title}</td>
              <td>{d.doc_type.replace('_', ' ')}</td>
              <td>{d.subject_name || '—'}</td>
              <td>{d.file_size_kb ? `${d.file_size_kb} KB` : '—'}</td>
              <td>{d.is_indexed
                ? <span className="hod-pill hod-pill-ok">In knowledge base</span>
                : <span className="hod-pill">Not indexed</span>}</td>
              <td><button className="hod-link-danger" onClick={() => remove(d.id)}>Delete</button></td>
            </tr>
          ))}
          {!docs.length && <tr><td colSpan={6} className="hod-muted">No documents yet.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------- 6. FACULTY */

function FacultyPanel({ token }: { token: string }) {
  const [list, setList] = useState<FacultyRow[]>([])
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => { hodApi.faculty(token).then(setList).catch(() => undefined) }, [token])

  return (
    <div>
      <p className="hod-muted hod-small hod-note">{list.length} faculty members in the department.</p>
      <div className="hod-faculty-grid">
        {list.map((f) => (
          <div className={`hod-faculty-card ${open === f.id ? 'open' : ''}`} key={f.id}
               onClick={() => setOpen(open === f.id ? null : f.id)}>
            <div className="hod-faculty-head">
              <div className="hod-avatar hod-avatar-sm">
                {f.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </div>
              <div>
                <strong>{f.name}</strong>
                {f.is_hod && <span className="hod-tag hod-tag-hod">HOD</span>}
                <p className="hod-muted hod-small">{f.designation || '—'}</p>
              </div>
            </div>

            <div className="hod-faculty-stats">
              <span>{f.achievement_count} publications</span>
              <span>{f.scholars_guiding} scholars</span>
              {f.experience_years != null && <span>{f.experience_years} yrs</span>}
            </div>

            {open === f.id && (
              <div className="hod-faculty-detail">
                <div><span>Email</span><p>{f.email}</p></div>
                {f.mobile && <div><span>Mobile</span><p>{f.mobile}</p></div>}
                <div><span>Qualification</span><p>{f.qualification || '—'}</p></div>
                <div><span>Specialization</span><p>{f.specialization || '—'}</p></div>
                <div><span>Research areas</span><p>{f.research_areas || '—'}</p></div>
                <div><span>Office</span><p>{f.office_location || '—'}</p></div>
                <div><span>Available</span><p>{f.available_hours || '—'}</p></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- SHELL */

export default function HodDashboard({ session, onClose }: { session: Session; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<HodStats | null>(null)

  useEffect(() => {
    hodApi.stats(session.token).then(setStats).catch(() => undefined)
  }, [session.token, tab])

  const activeLabel = TABS.find((t) => t.id === tab)?.label ?? 'Dashboard'

  return (
    <div className="hod-dashboard">

      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

      <aside className="hod-sidebar">

        <div className="hod-brand">
          <div className="hod-brand-icon">H</div>
          <div>
            <h2>HOD Portal</h2>
            <span>Department Dashboard</span>
          </div>
        </div>

        <nav className="hod-navigation">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`hod-nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'approvals' && stats?.pending_approvals
                ? <span className="hod-nav-badge">{stats.pending_approvals}</span> : null}
            </button>
          ))}
        </nav>

        <button className="hod-back" onClick={onClose}>Back to site</button>

      </aside>

      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <main className="hod-main">

        <header className="hod-header">
          <div>
            <h1>{activeLabel}</h1>
            <p>{session.name} · Dept. of Computer Science &amp; Engineering</p>
          </div>

          <div className="hod-user">
            <div className="hod-avatar hod-avatar-sm">{session.name.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{session.name}</strong>
              <span>Head of Department</span>
            </div>
          </div>
        </header>

        {/* ================================================= */}
        {/* DASHBOARD */}
        {/* ================================================= */}

        {tab === 'dashboard' && (
          <section className="hod-content">

            <div className="hod-welcome-card">
              <div>
                <h2>Welcome to your Department Dashboard</h2>
                <p>
                  Manage faculty profiles, review message approvals, add student
                  achievements and events, and keep LMS resources up to date —
                  all from one place.
                </p>
              </div>
            </div>

            {stats && (
              <div className="hod-stats">
                {[
                  ['Students', stats.total_students],
                  ['Faculty', stats.total_faculty],
                  ['Achievements', stats.published_achievements],
                  ['Upcoming events', stats.upcoming_events],
                  ['LMS files', stats.lms_documents],
                  ['Pending approvals', stats.pending_approvals],
                ].map(([label, value]) => (
                  <div className="hod-stat-card" key={label as string}>
                    <span className="hod-stat-label">{label as string}</span>
                    <strong>{value as number}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="hod-card">
              <div className="hod-card-heading">
                <div>
                  <h2>Quick actions</h2>
                  <p className="hod-section-description">Jump straight into the most common tasks.</p>
                </div>
              </div>
              <div className="hod-quick-actions">
                <button onClick={() => setTab('approvals')}>Review approvals</button>
                <button onClick={() => setTab('achievements')}>Add achievement</button>
                <button onClick={() => setTab('events')}>Add event</button>
                <button onClick={() => setTab('lms')}>Upload LMS document</button>
                <button className="hod-primary-button" onClick={() => setTab('faculty')}>View faculty</button>
              </div>
            </div>

          </section>
        )}

        {/* ================================================= */}
        {/* PROFILE */}
        {/* ================================================= */}

        {tab === 'profile' && (
          <section className="hod-content">
            <div className="hod-card hod-card-profile">
              <ProfilePanel token={session.token} />
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* APPROVALS */}
        {/* ================================================= */}

        {tab === 'approvals' && (
          <section className="hod-content">
            <div className="hod-card hod-card-approvals">
              <h2>Message Approvals</h2>
              <ApprovalsPanel token={session.token} />
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* ACHIEVEMENTS */}
        {/* ================================================= */}

        {tab === 'achievements' && (
          <section className="hod-content">
            <div className="hod-card hod-card-achievements">
              <h2>Add Student Achievement</h2>
              <AchievementPanel token={session.token} />
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* EVENTS */}
        {/* ================================================= */}

        {tab === 'events' && (
          <section className="hod-content">
            <div className="hod-card hod-card-events">
              <h2>Add Event</h2>
              <EventsPanel token={session.token} />
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* LMS */}
        {/* ================================================= */}

        {tab === 'lms' && (
          <section className="hod-content">
            <div className="hod-card hod-card-lms">
              <h2>LMS Documents</h2>
              <LmsPanel token={session.token} />
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* FACULTY */}
        {/* ================================================= */}

        {tab === 'faculty' && (
          <section className="hod-content">
            <div className="hod-card hod-card-faculty">
              <h2>Faculty</h2>
              <FacultyPanel token={session.token} />
            </div>
          </section>
        )}

      </main>
    </div>
  )
}