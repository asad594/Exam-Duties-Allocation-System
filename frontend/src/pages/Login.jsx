import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Container, Form } from 'react-bootstrap'
import { homeFor, useAuth } from '../auth/useAuth'
import { errorMessage } from '../api/errors'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user)} replace />

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      navigate(homeFor(await login(form.email, form.password)), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  return (
    <Container className="login-page">
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h1 className="h4 mb-1">Exam Duties Allocation</h1>
          <p className="text-muted mb-4">Sign in to continue</p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={submit}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={form.email} onChange={update('email')} required autoFocus />
            </Form.Group>
            <Form.Group className="mb-4" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" value={form.password} onChange={update('password')} required />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  )
}
