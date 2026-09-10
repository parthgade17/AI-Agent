const API_BASE = 'http://localhost:8000'

export type Role = 'student' | 'faculty' | 'admin'

export interface Session {
  token: string
  role: Role
  role_label: string
  name: string
}

export interface SignupPayload {
  name: string
  email: string
  mobile: string
  password: string
  role: Role
}

async function request<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running on port 8000.')
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.detail) detail = data.detail
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export const api = {
  login: (username: string, password: string) =>
    request<Session>('/api/login', { username, password }),

  signup: (payload: SignupPayload) => request<Session>('/api/signup', payload),
}

/* ---------------------------------------------------------------- HOD API */

const BASE = API_BASE

async function hodRequest<T>(
  path: string,
  token: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/hod${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 8000?')
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const d = await res.json()
      if (d?.detail) detail = typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)
    } catch { /* no body */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export interface HodProfile {
  id: number
  name: string
  email: string
  mobile: string | null
  designation: string | null
  qualification: string | null
  specialization: string | null
  research_areas: string | null
  experience_years: number | null
  office_location: string | null
  available_hours: string | null
  department_name: string | null
  achievements: { id: number; title: string; category: string; venue: string | null; impact_factor: number | null; achieved_on: string | null }[]
  scholars: { id: number; name: string; topic: string | null; status: string }[]
}

export interface ApproveResult {
  ok: boolean
  published: string
  record_id: number
  message?: string
  whatsapp_url?: string
  groups?: string[]
}

export interface Draft {
  id: number
  title: string
  body: string
  ref_type: string | null
  ref_id: number | null
  status: string
  created_at: string
}

export interface StudentOption {
  id: number
  name: string
  roll_no: string | null
  current_year: number | null
  division: string | null
}

export interface EventRow {
  id: number
  title: string
  scope: string
  event_type: string
  venue: string | null
  starts_at: string
  is_published: boolean
  registrations: number
}

export interface LmsRow {
  id: number
  title: string
  doc_type: string
  semester: number | null
  file_size_kb: number | null
  is_indexed: boolean
  uploaded_at: string
  subject_name: string | null
  uploaded_by_name: string
}

export interface SubjectOption {
  id: number
  code: string
  name: string
  semester: number | null
}

export interface FacultyRow {
  id: number
  name: string
  email: string
  mobile: string | null
  designation: string | null
  qualification: string | null
  specialization: string | null
  research_areas: string | null
  experience_years: number | null
  office_location: string | null
  available_hours: string | null
  is_hod: boolean
  achievement_count: number
  scholars_guiding: number
}

export interface HodStats {
  total_students: number
  total_faculty: number
  published_achievements: number
  pending_verification: number
  upcoming_events: number
  lms_documents: number
  kb_documents: number
  ai_unanswered: number
  open_issues: number
  pending_approvals: number
}

export const hodApi = {
  stats:      (t: string) => hodRequest<HodStats>('/stats', t),
  profile:    (t: string) => hodRequest<HodProfile>('/profile', t),
  saveProfile:(t: string, data: Record<string, unknown>) =>
                hodRequest<HodProfile>('/profile', t, 'PUT', data),

  drafts:     (t: string) => hodRequest<Draft[]>('/approvals', t),
  editDraft:  (t: string, id: number, data: { title?: string; body?: string }) =>
                hodRequest<{ ok: boolean }>(`/approvals/${id}`, t, 'PATCH', data),
  approve:    (t: string, id: number) =>
                hodRequest<ApproveResult>(`/approvals/${id}/approve`, t, 'POST'),
  regenerate: (t: string, id: number) =>
                hodRequest<{ ok: boolean; body: string; written_by: string }>(
                  `/approvals/${id}/regenerate`, t, 'POST'),
  whatsappGroups: (t: string) =>
                hodRequest<{ groups: string[] }>('/whatsapp-groups', t),
  reject:     (t: string, id: number) =>
                hodRequest<{ ok: boolean }>(`/approvals/${id}/reject`, t, 'POST'),

  students:   (t: string) => hodRequest<StudentOption[]>('/students', t),
  addAchievement: (t: string, data: Record<string, unknown>) =>
                hodRequest<{ id: number }>('/achievements', t, 'POST', data),

  events:     (t: string) => hodRequest<EventRow[]>('/events', t),
  addEvent:   (t: string, data: Record<string, unknown>) =>
                hodRequest<{ id: number }>('/events', t, 'POST', data),

  subjects:   (t: string) => hodRequest<SubjectOption[]>('/subjects', t),
  lms:        (t: string) => hodRequest<LmsRow[]>('/lms', t),
  deleteLms:  (t: string, id: number) =>
                hodRequest<{ ok: boolean }>(`/lms/${id}`, t, 'DELETE'),
  uploadLms:  async (t: string, form: FormData) => {
    const res = await fetch(`${BASE}/api/hod/lms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },   // no Content-Type: the browser sets the boundary
      body: form,
    })
    if (!res.ok) {
      let detail = `Upload failed (${res.status})`
      try { const d = await res.json(); if (d?.detail) detail = d.detail } catch { /* none */ }
      throw new Error(detail)
    }
    return res.json()
  },

  faculty:    (t: string) => hodRequest<FacultyRow[]>('/faculty', t),
}

/* ------------------------------------------------------------ STUDENT API */

async function studentRequest<T>(
  path: string,
  token: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/student${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 8000?')
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const d = await res.json()
      if (d?.detail) detail = typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)
    } catch { /* no body */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export interface StudentProfileData {
  id: number
  name: string
  email: string
  mobile: string | null
  roll_no: string | null
  prn: string | null
  current_year: number | null
  current_semester: number | null
  division: string | null
  admission_year: number | null
  graduation_year: number | null
  github_url: string | null
  linkedin_url: string | null
  department_name: string | null
  course_name: string | null
}

export interface LabRow {
  id?: number
  name: string
  location?: string | null
  total_systems: number | null
  operating_system: string | null
  processor: string | null
  memory: string | null
  software: string | null
  features: string | null
  sponsored_by: string | null
  is_coe: boolean
  is_24x7: boolean
}

export interface DepartmentData {
  id: number
  name: string
  code: string
  school: string | null
  university: string | null
  established_year: number | null
  vision: string | null
  mission: string | null
  hod_message: string | null
  about: string | null
  email: string | null
  phone: string | null
  faculty_count: number
  student_count: number
  labs: LabRow[]
  courses: { name: string; short_name: string | null; degree_level: string; duration_years: number | null; intake: number | null }[]
}

export interface StudentAchievement {
  id: number
  title: string
  category: string
  description: string | null
  event_name: string | null
  organiser: string | null
  position: string | null
  prize_amount: number | null
  achieved_on: string | null
  is_published: boolean
  verified_at: string | null
  verified_by_name: string | null
  created_at: string
}

export interface StudentLms {
  current_semester: number | null
  current_year: number | null
  subjects: { id: number; code: string; name: string; semester: number | null; credits: number | null; subject_type: string; faculty_name: string | null }[]
  documents: { id: number; title: string; doc_type: string; semester: number | null; unit_number: number | null; file_size_kb: number | null; uploaded_at: string; subject_name: string | null; uploaded_by_name: string }[]
}

export interface StudentFacultyRow {
  id: number
  name: string
  designation: string | null
  qualification: string | null
  specialization: string | null
  research_areas: string | null
  office_location: string | null
  available_hours: string | null
  is_hod: boolean
  achievement_count: number
}

export interface PublicEvent {
  id: number
  title: string
  scope: string
  event_type: string
  description: string | null
  venue: string | null
  starts_at: string
  ends_at: string | null
  organiser: string | null
  speaker: string | null
  registration_link: string | null
  registration_count: number
}

export interface AnnouncementRow {
  id: number
  title: string
  body: string
  priority: string
  is_pinned: boolean
  published_at: string
}

export const studentApi = {
  profile:     (t: string) => studentRequest<StudentProfileData>('/profile', t),
  saveProfile: (t: string, data: Record<string, unknown>) =>
                 studentRequest<StudentProfileData>('/profile', t, 'PUT', data),
  department:  (t: string) => studentRequest<DepartmentData>('/department', t),
  faculty:     (t: string) => studentRequest<StudentFacultyRow[]>('/faculty', t),
  labs:        (t: string) => studentRequest<LabRow[]>('/labs', t),
  achievements:(t: string) => studentRequest<StudentAchievement[]>('/achievements', t),
  addAchievement: (t: string, data: Record<string, unknown>) =>
                 studentRequest<{ id: number; status: string }>('/achievements', t, 'POST', data),
  deleteAchievement: (t: string, id: number) =>
                 studentRequest<{ ok: boolean }>(`/achievements/${id}`, t, 'DELETE'),
  lms:         (t: string) => studentRequest<StudentLms>('/lms', t),
  events:      (t: string) => studentRequest<PublicEvent[]>('/events', t),
  announcements: (t: string) => studentRequest<AnnouncementRow[]>('/announcements', t),
}

/* ------------------------------------------------------------ FACULTY API */

async function facultyRequest<T>(
  path: string,
  token: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/faculty${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 8000?')
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const d = await res.json()
      if (d?.detail) detail = typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)
    } catch { /* no body */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export interface FacultyProfileData {
  id: number
  name: string
  email: string
  mobile: string | null
  employee_code: string | null
  designation: string | null
  qualification: string | null
  specialization: string | null
  research_areas: string | null
  experience_years: number | null
  office_location: string | null
  available_hours: string | null
  is_hod: boolean
  department_name: string | null
  scholars: { id: number; name: string; topic: string | null; status: string }[]
}

export interface FacultyAchievement {
  id: number
  title: string
  category: string
  description: string | null
  venue: string | null
  impact_factor: number | null
  achieved_on: string | null
  created_at: string
}

export interface PendingStudentAchievement {
  id: number
  title: string
  category: string
  description: string | null
  event_name: string | null
  organiser: string | null
  position: string | null
  prize_amount: number | null
  achieved_on: string | null
  is_published: boolean
  verified_at: string | null
  verified_by_name: string | null
  created_at: string
  student_name: string
  roll_no: string | null
  current_year: number | null
  division: string | null
}

export interface FacultySubject {
  id: number
  code: string
  name: string
  semester: number | null
  credits: number | null
  subject_type: string
  is_mine: boolean
}

export interface FacultyLmsRow {
  id: number
  title: string
  doc_type: string
  description: string | null
  semester: number | null
  unit_number: number | null
  file_size_kb: number | null
  for_students: boolean
  is_indexed: boolean
  uploaded_at: string
  download_count: number
  subject_name: string | null
  uploaded_by_name: string
}

export interface FacultyStats {
  my_achievements: number
  my_subjects: number
  my_uploads: number
  my_scholars: number
  pending_verifications: number
  verified_by_me: number
  total_students: number
  upcoming_events: number
}

export const facultyApi = {
  stats:       (t: string) => facultyRequest<FacultyStats>('/stats', t),
  profile:     (t: string) => facultyRequest<FacultyProfileData>('/profile', t),
  saveProfile: (t: string, data: Record<string, unknown>) =>
                 facultyRequest<FacultyProfileData>('/profile', t, 'PUT', data),

  achievements:      (t: string) => facultyRequest<FacultyAchievement[]>('/achievements', t),
  addAchievement:    (t: string, data: Record<string, unknown>) =>
                       facultyRequest<{ id: number }>('/achievements', t, 'POST', data),
  editAchievement:   (t: string, id: number, data: Record<string, unknown>) =>
                       facultyRequest<{ ok: boolean }>(`/achievements/${id}`, t, 'PUT', data),
  deleteAchievement: (t: string, id: number) =>
                       facultyRequest<{ ok: boolean }>(`/achievements/${id}`, t, 'DELETE'),

  students:            (t: string) => facultyRequest<StudentOption[]>('/students', t),
  studentAchievements: (t: string, pendingOnly = false) =>
                         facultyRequest<PendingStudentAchievement[]>(
                           `/student-achievements${pendingOnly ? '?pending_only=true' : ''}`, t),
  addStudentAchievement: (t: string, data: Record<string, unknown>) =>
                         facultyRequest<{ id: number }>('/student-achievements', t, 'POST', data),
  verifyStudentAchievement: (t: string, id: number) =>
                         facultyRequest<{ ok: boolean }>(`/student-achievements/${id}/verify`, t, 'POST'),
  rejectStudentAchievement: (t: string, id: number) =>
                         facultyRequest<{ ok: boolean }>(`/student-achievements/${id}/reject`, t, 'POST'),

  subjects:  (t: string) => facultyRequest<FacultySubject[]>('/subjects', t),
  lms:       (t: string, mineOnly = false) =>
               facultyRequest<FacultyLmsRow[]>(`/lms${mineOnly ? '?mine_only=true' : ''}`, t),
  deleteLms: (t: string, id: number) =>
               facultyRequest<{ ok: boolean }>(`/lms/${id}`, t, 'DELETE'),
  uploadLms: async (t: string, form: FormData) => {
    const res = await fetch(`${API_BASE}/api/faculty/lms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: form,
    })
    if (!res.ok) {
      let detail = `Upload failed (${res.status})`
      try { const d = await res.json(); if (d?.detail) detail = d.detail } catch { /* none */ }
      throw new Error(detail)
    }
    return res.json()
  },
}

/* ------------------------------------------------------------- PUBLIC API */
/* No authentication. Feeds the landing page from the same tables the AI
   agent ingests, so the site and the assistant cannot contradict each other. */

async function publicRequest<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/public${path}`)
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 8000?')
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}

export interface PublicDepartment {
  name: string
  code: string
  school: string | null
  university: string | null
  established_year: number | null
  about: string | null
  vision: string | null
  mission: string | null
  hod_message: string | null
  email: string | null
  phone: string | null
  address: string | null
  courses: { name: string; short_name: string | null; degree_level: string; duration_years: number | null }[]
  subjects: { code: string; name: string; semester: number | null; subject_type: string }[]
  labs: LabRow[]
  stats: { faculty: number; students: number; programmes: number; laboratories: number }
}

export interface PublicFaculty {
  id: number
  name: string
  email: string
  designation: string | null
  qualification: string | null
  specialization: string | null
  research_areas: string | null
  experience_years: number | null
  office_location: string | null
  available_hours: string | null
  is_hod: boolean
  publications: number
  scholars: number
}

export interface PublicAchievements {
  department: {
    title: string; category: string; description: string | null
    venue: string | null; achieved_on: string | null; faculty_name: string
  }[]
  students: {
    title: string; category: string; description: string | null
    event_name: string | null; organiser: string | null; position: string | null
    prize_amount: number | null; achieved_on: string | null
    student_name: string; current_year: number | null
  }[]
}

export interface PublicEvents {
  upcoming: PublicEvent[]
  past: PublicEvent[]
}

export const publicApi = {
  department:    () => publicRequest<PublicDepartment>('/department'),
  faculty:       () => publicRequest<PublicFaculty[]>('/faculty'),
  achievements:  () => publicRequest<PublicAchievements>('/achievements'),
  events:        () => publicRequest<PublicEvents>('/events'),
  announcements: () => publicRequest<AnnouncementRow[]>('/announcements'),
}
/* --------------------------------------------------------------- CHAT API */

export interface ChatAnswer {
  answer: string
  sources: string[]
  conversation_id: number | null
  grounded: boolean
  retrieved: number
  latency_ms: number
  model: string
}

export interface ChatConversation {
  id: number
  title: string | null
  message_count: number
  started_at: string
  last_message_at: string
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  sources: string[] | null
  answered: boolean | null
  created_at: string
}

async function chatRequest<T>(
  path: string,
  token: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/chat${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 8000?')
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const d = await res.json()
      if (d?.detail) detail = typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)
    } catch { /* no body */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export const chatApi = {
  ask: (t: string, question: string, conversation_id?: number | null) =>
    chatRequest<ChatAnswer>('/ask', t, 'POST', { question, conversation_id }),

  conversations: (t: string) =>
    chatRequest<ChatConversation[]>('/conversations', t),

  history: (t: string, id: number) =>
    chatRequest<ChatTurn[]>(`/conversations/${id}`, t),
}