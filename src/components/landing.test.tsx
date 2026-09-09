import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import LandingPage from './components/LandingPage'

const DEPT = {
  name: 'Computer Science and Engineering', code: 'CSE',
  school: 'School of Engineering and Technology', university: 'Sanjivani University',
  address: 'Kopargaon', established_year: null,
  about: 'First paragraph about the department.\n\nSecond paragraph.',
  vision: 'To achieve global recognition.',
  mission: 'Mission line one.\n\nMission line two.',
  hod_message: 'The 21st century is the technical era.',
  email: 'project@sanjivani.edu.in', phone: null,
  courses: [{ name: 'B.Tech. CSE', short_name: 'B.Tech.', degree_level: 'UG', duration_years: 4 }],
  subjects: [{ code: 'CSE-PE', name: 'Prompt Engineering', semester: null, subject_type: 'core' }],
  labs: [{
    name: 'Computer Vision Laboratory', total_systems: 120,
    operating_system: 'Ubuntu 24.04 LTS', processor: 'i5-12400F', memory: '16 GiB',
    software: null, features: 'Real-time societal computing problems.',
    sponsored_by: 'NCCU Taiwan', is_coe: true, is_24x7: true,
  }],
  stats: { faculty: 2, students: 1, programmes: 1, laboratories: 4 },
}

function mockApi(overrides: Record<string, unknown> = {}) {
  vi.doMock('./api', () => ({
    api: { login: vi.fn(), signup: vi.fn() },
    hodApi: {}, studentApi: {}, facultyApi: {},
    publicApi: {
      department: () => Promise.resolve(DEPT),
      faculty: () => Promise.resolve([
        { id: 1, name: 'Dr. Mahendra Gawali', designation: 'Head of Department',
          qualification: 'PhD (IT)', specialization: 'Cloud Computing',
          research_areas: 'Digital Twin', experience_years: 18, is_hod: true,
          publications: 19, scholars: 8, email: 'h@s.in',
          office_location: null, available_hours: null },
      ]),
      achievements: () => Promise.resolve({
        department: [{ title: 'First Prize, Micromouse event, IIT Guwahati',
          category: 'award', description: 'Autonomous maze-solving robots.',
          venue: 'IIT Guwahati', achieved_on: '2026-02-01', faculty_name: 'Dr. Gawali' }],
        students: [],
      }),
      events: () => Promise.resolve({
        upcoming: [],
        past: [{ id: 1, title: 'Blind Coding Competition', scope: 'department',
          event_type: 'competition', description: 'Write C++ without the monitor.',
          venue: null, starts_at: '2025-09-16T10:00:00+05:30', ends_at: null,
          organiser: null, speaker: null, registration_link: null, registration_count: 0 }],
      }),
      announcements: () => Promise.resolve([]),
      ...overrides,
    },
  }))
}

describe('landing page content', () => {
  it('renders every section inline on one page', async () => {
    vi.resetModules(); mockApi()
    const { default: Page } = await import('./components/LandingPage')
    render(<Page />)

    await waitFor(() => expect(screen.getByText(/First paragraph/)).toBeTruthy())

    // all four sections present at once — no page swap
    for (const id of ['overview', 'faculty', 'achievements', 'events']) {
      expect(document.getElementById(id)).toBeTruthy()
    }

    expect(screen.getByText(/To achieve global recognition/)).toBeTruthy()
    expect(screen.getByText(/Mission line two/)).toBeTruthy()
    expect(screen.getByText(/technical era/)).toBeTruthy()
    expect(screen.getByText(/Computer Vision Laboratory/)).toBeTruthy()
    expect(screen.getByText(/Dr. Mahendra Gawali/)).toBeTruthy()
    expect(screen.getByText(/Micromouse/)).toBeTruthy()
    expect(screen.getByText(/Blind Coding Competition/)).toBeTruthy()
  })

  it('shows a readable error instead of a blank page when the backend is down', async () => {
    vi.resetModules()
    mockApi({ department: () => Promise.reject(new Error('Cannot reach the server.')) })
    const { default: Page } = await import('./components/LandingPage')
    render(<Page />)

    await waitFor(() =>
      expect(screen.getByText(/Could not load department information/)).toBeTruthy(),
    )
    // headings still render, so the page is never empty
    expect(screen.getAllByText('Department Overview').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Faculty').length).toBeGreaterThan(0)
  })
})
