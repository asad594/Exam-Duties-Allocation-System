import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Badge, Button, Container, Nav, Navbar } from 'react-bootstrap'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import LiveNotifications from '../realtime/LiveNotifications'
import { useHubEvent } from '../realtime/useRealtime'

const adminLinks = [
  ['/admin', 'Dashboard'], ['/admin/faculty', 'Faculty'], ['/admin/rooms', 'Rooms'], ['/admin/courses', 'Courses'],
  ['/admin/sessions', 'Exam Sessions'], ['/admin/unavailability', 'Unavailability'], ['/admin/roster', 'Roster'],
  ['/admin/leave', 'Leave requests'],
]
const facultyLinks = [['/my-duties', 'My Duties'], ['/leave', 'Leave']]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user.role === 'Admin'
  const [pending, setPending] = useState(0)

  // Pending leave count for the admin badge; pages call refreshPending after a decision (via Outlet context).
  const refreshPending = useCallback(() => {
    if (isAdmin) api.get('/leave-requests', { params: { status: 'Pending' } }).then(({ data }) => setPending(data.length)).catch(() => {})
  }, [isAdmin])

  useEffect(refreshPending, [refreshPending])
  useHubEvent('LeaveRequested', refreshPending)

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <LiveNotifications />
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container fluid>
          <Navbar.Brand>EDAS</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {(isAdmin ? adminLinks : facultyLinks).map(([to, label]) => (
                <Nav.Link key={to} as={NavLink} to={to} end>
                  {label}
                  {to === '/admin/leave' && pending > 0 && <Badge bg="warning" text="dark" pill className="ms-1" data-testid="pending-badge">{pending}</Badge>}
                </Nav.Link>
              ))}
            </Nav>
            <Navbar.Text className="me-3">Signed in as {user.role}</Navbar.Text>
            <Button variant="outline-light" size="sm" onClick={signOut}>Logout</Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid className="pb-5">
        <Outlet context={{ refreshPending }} />
      </Container>
    </>
  )
}
