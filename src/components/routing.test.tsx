import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import LandingPage from './components/LandingPage'
import type { Session } from './api'

// Stub every network call so the test exercises routing, not the backend.
vi.mock('./api', async () => {
  const empty = () => Promise.resolve([])
  return {
    api: {
      login: vi.fn(),
      signup: vi.fn(),
    },
    hodApi: {
      stats: () => Promise.resolve({}),
      profile: () => Promise.resolve({ name: 'Dr. Gawali', achievements: [], scholars: [] }),
      drafts: empty, faculty: empty, events: empty, lms: empty,
      students: empty, subjects: empty,
    },
    studentApi: {
      profile: () => Promise.resolve({ name: 'Demo Student', email: 'x', achievements: [] }),
      department: () => Promise.resolve({ labs: [], courses: [] }),
      faculty: empty, labs: empty, achievements: empty, events: empty,
      announcements: empty,
      lms: () => Promise.resolve({ subjects: [], documents: [] }),
    },
    facultyApi: {
      profile: () => Promise.resolve({ name: 'Demo Teacher', scholars: [] }),
      achievements: empty, studentAchievements: empty, lms: empty,
      students: empty, subjects: empty,
      stats: () => Promise.resolve({}),
    },
  }
})

function makeSession(role: Session['role'], name: string): Session {
  return { token: 't', role, role_label: role, name }
}

describe('LandingPage role routing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the landing page when signed out', () => {
    render(<LandingPage />)
    expect(screen.getByText(/Department of Computer Science/i)).toBeTruthy()
  })

  it('opens the login modal from the menu', async () => {
    render(<LandingPage />)
    fireEvent.click(screen.getByRole('button', { name: '⋮' }))
    fireEvent.click(screen.getByText('Student Login'))
    await waitFor(() => expect(screen.getByText(/Sign in to continue/i)).toBeTruthy())
  })

  const cases: [Session['role'], string, RegExp][] = [
    ['student', 'Demo Student', /Student Portal/i],
    ['faculty', 'Demo Teacher', /Faculty|Teacher/i],
    ['admin', 'Dr. Gawali', /HOD Dashboard/i],
  ]

  for (const [role, name, expected] of cases) {
    it(`routes a ${role} straight to their dashboard after login`, async () => {
      const { api } = await import('./api')
      const session = makeSession(role, name)
      ;(api.login as ReturnType<typeof vi.fn>).mockResolvedValue(session)

      render(<LandingPage />)
      fireEvent.click(screen.getByRole('button', { name: '⋮' }))
      fireEvent.click(
        screen.getByText(
          role === 'admin' ? 'HOD Login' : role === 'faculty' ? 'Teacher Login' : 'Student Login',
        ),
      )

      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: 'a@b.in' },
      })
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Sign in as/i }))

      await waitFor(() => {
        expect(screen.queryAllByText(expected).length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })
  }
})

describe('signup routing', () => {
  it('routes a new student signup to the Student Portal', async () => {
    const { api } = await import('./api')
    ;(api.signup as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSession('student', 'New Student'),
    )

    render(<LandingPage />)
    fireEvent.click(screen.getByRole('button', { name: '⋮' }))
    fireEvent.click(screen.getByText('Student Login'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign up' })[0])

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'New Student' } })
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'n@s.edu.in' } })
    fireEvent.change(screen.getByLabelText(/Mobile number/i), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(
      () => expect(screen.queryAllByText(/Student Portal/i).length).toBeGreaterThan(0),
      { timeout: 3000 },
    )
  })

  it('explains why signing up under Teacher does not open the faculty portal', async () => {
    const { api } = await import('./api')
    // The server always creates a student, whichever button was used.
    ;(api.signup as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSession('student', 'Someone'),
    )

    render(<LandingPage />)
    fireEvent.click(screen.getByRole('button', { name: '⋮' }))
    fireEvent.click(screen.getByText('Teacher Login'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign up' })[0])

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Someone' } })
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 's@s.edu.in' } })
    fireEvent.change(screen.getByLabelText(/Mobile number/i), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(
      () => expect(screen.getByText(/department office/i)).toBeTruthy(),
      { timeout: 3000 },
    )
  })
})
