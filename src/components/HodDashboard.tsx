import { useCallback, useEffect, useState } from 'react'
import { hodApi } from '../api'
import type { Draft, HodProfile, HodStats, Session } from '../api'
import './HodDashboard.css'
import AiChat from './AiChat'

type Tab = 'dashboard' | 'profile' | 'approvals' | 'ai-agent'

const TABS: { id: Tab; la bel: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profile', label: 'My Profile' },
  { id: 'approvals', label: 'Message Approvals' },
  { id: 'ai-agent', label: 'AI Agent' },
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
  const [busyId, setBusyId] = useState<number | null>(null)
  const [msg, setMsg] = useState({ kind: 'ok' as 'ok' | 'err', text: '' })

  // Set after an approval, so the HOD can send the message straight away.
  const [sendNow, setSendNow] = useState<{
    message: string
    whatsapp_url: string
    groups: string[]
  } | null>(null)

  const load = useCallback(() => {
    hodApi.drafts(token).then(setDrafts).catch((e) => setMsg({ kind: 'err', text: e.message }))
  }, [token])

  useEffect(load, [load])

  async function act(fn: Promise<unknown>, ok: string, id?: number) {
    setBusyId(id ?? null)
    try { await fn; setMsg({ kind: 'ok', text: ok }); setEditId(null); load() }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }) }
    setBusyId(null)
  }

  async function approve(id: number) {
    setBusyId(id)
    try {
      const r = await hodApi.approve(token, id)
      setMsg({ kind: 'ok', text: 'Approved and published.' })
      // The backend returns the approved text and a WhatsApp share link.
      if (r.whatsapp_url) {
        setSendNow({
          message: r.message ?? '',
          whatsapp_url: r.whatsapp_url,
          groups: r.groups ?? [],
        })
      }
      setEditId(null)
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' })
    }
    setBusyId(null)
  }

  async function regenerate(id: number) {
    setBusyId(id)
    try {
      const r = await hodApi.regenerate(token, id)
      setMsg({
        kind: 'ok',
        text: r.written_by === 'template'
          ? 'Rewritten from the template — the AI was unavailable.'
          : `Rewritten by ${r.written_by}.`,
      })
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' })
    }
    setBusyId(null)
  }

  return (
    <div>
      <Banner kind={msg.kind} text={msg.text} />

      <p className="hod-muted hod-small hod-note">
        Achievements and events submitted by faculty arrive here as AI-written
        announcements. Review the wording, rewrite or edit it if needed, then
        approve — approving publishes the record to the department page and
        releases the message for sending.
      </p>

      {/* Shown once, right after an approval */}
      {sendNow && (
        <div className="hod-send-panel">
          <div className="hod-send-head">
            <strong>Approved. Send it to the CSE groups.</strong>
            <button className="hod-close" onClick={() => setSendNow(null)}>&times;</button>
          </div>

          <pre className="hod-draft-body">{sendNow.message}</pre>

          {sendNow.groups.length > 0 && (
            <p className="hod-muted hod-small">
              Send to: {sendNow.groups.join(' · ')}
            </p>
          )}

          <div className="hod-actions">
            <a className="hod-btn hod-btn-wa" href={sendNow.whatsapp_url}
               target="_blank" rel="noopener noreferrer">
              Open WhatsApp with this message
            </a>
            <button className="hod-btn-ghost" onClick={() => {
              navigator.clipboard?.writeText(sendNow.message)
              setMsg({ kind: 'ok', text: 'Message copied.' })
            }}>
              Copy text
            </button>
          </div>

          <p className="hod-muted hod-small">
            WhatsApp opens with the message ready. Pick the CSE groups and send.
          </p>
        </div>
      )}

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
                <button className="hod-btn" disabled={busyId === d.id} onClick={() =>
                  act(hodApi.editDraft(token, d.id, { body: text }), 'Draft updated.', d.id)}>
                  Save draft
                </button>
                <button className="hod-btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <button className="hod-btn" disabled={busyId === d.id}
                        onClick={() => approve(d.id)}>
                  {busyId === d.id ? 'Working…' : 'Approve & send'}
                </button>
                <button className="hod-btn-ghost" disabled={busyId === d.id}
                        onClick={() => regenerate(d.id)}>
                  {busyId === d.id ? 'Rewriting…' : 'Rewrite with AI'}
                </button>
                <button className="hod-btn-ghost"
                        onClick={() => { setEditId(d.id); setText(d.body) }}>
                  Edit
                </button>
                <button className="hod-btn-danger" disabled={busyId === d.id} onClick={() =>
                  act(hodApi.reject(token, d.id), 'Draft rejected.', d.id)}>
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
                <button onClick={() => setTab('profile')}>My profile</button>
                <button className="hod-primary-button" onClick={() => setTab('ai-agent')}>Ask the AI agent</button>
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

        {/* ================================================= */}
        {/* EVENTS */}
        {/* ================================================= */}

        {/* ================================================= */}
        {/* LMS */}
        {/* ================================================= */}

        {/* ================================================= */}
        {/* FACULTY */}
        {/* ================================================= */}

        {/* ================================================= */}
        {/* AI AGENT */}
        {/* ================================================= */}

        {tab === 'ai-agent' && (
          <section className="hod-content">
            <div className="hod-card">
              <h2>AI Agent</h2>
              <p className="hod-section-description">
                Ask about faculty, labs, events, achievements, or academics —
                the agent only answers from the department's own records.
              </p>
              <div style={{ marginTop: 20 }}>
                <AiChat
                  token={session.token}
                  placeholder="Ask about faculty, labs, events, achievements, or academics…"
                />
              </div>
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* STUDENT PERFORMANCE */}
        {/* ================================================= */}

      </main>
    </div>
  )
}