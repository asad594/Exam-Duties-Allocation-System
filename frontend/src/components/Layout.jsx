import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button, Container, Nav, Navbar } from 'react-bootstrap'
import { useAuth } from '../auth/useAuth'

const adminLinks = [
  ['/admin', 'Dashboard'], ['/admin/faculty', 'Faculty'], ['/admin/rooms', 'Rooms'], ['/admin/courses', 'Courses'],
  ['/admin/sessions', 'Exam Sessions'], ['/admin/unavailability', 'Unavailability'], ['/admin/roster', 'Roster'],
]
const facultyLinks = [['/my-duties', 'My Duties']]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = user.role === 'Admin' ? adminLinks : facultyLinks

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container fluid>
          <Navbar.Brand>EDAS</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {links.map(([to, label]) => <Nav.Link key={to} as={NavLink} to={to} end>{label}</Nav.Link>)}
            </Nav>
            <Navbar.Text className="me-3">Signed in as {user.role}</Navbar.Text>
            <Button variant="outline-light" size="sm" onClick={signOut}>Logout</Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid className="pb-5">
        <Outlet />
      </Container>
    </>
  )
}
