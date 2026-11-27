import { Navigate, Outlet, useOutletContext } from 'react-router-dom'
import { Spinner } from 'react-bootstrap'
import { homeFor, useAuth } from './useAuth'

// Wraps routes that need a logged-in user, optionally with a specific role; passes the parent's outlet context through.
export default function ProtectedRoute({ role }) {
  const { user, ready } = useAuth()
  const context = useOutletContext()
  if (!ready) return <div className="text-center mt-5"><Spinner animation="border" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />
  return <Outlet context={context} />
}
