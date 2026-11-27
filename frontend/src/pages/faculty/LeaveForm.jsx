import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap'
import { api } from '../../api/client'
import { errorMessage } from '../../api/errors'

const today = () => new Date().toLocaleDateString('en-CA')
const empty = { startDate: '', endDate: '', reason: '' }

// Inline checks only guide the user; the API enforces the same rules and its 422 reason is shown as-is.
function problems({ startDate, endDate }) {
  return {
    startDate: startDate && startDate < today() ? 'Start date cannot be in the past.' : '',
    endDate: startDate && endDate && endDate < startDate ? 'End date cannot be before the start date.' : '',
  }
}

export default function LeaveForm({ onCreated }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const invalid = problems(form)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/leave-requests', { ...form, reason: form.reason || null })
      setForm(empty)
      onCreated()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const field = (name) => ({ value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }) })

  return (
    <Card body className="mb-4">
      <h2 className="h5 mb-3">Request leave</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={submit} noValidate>
        <Row className="g-3">
          <Form.Group as={Col} md={3} controlId="leave-start">
            <Form.Label>Start date</Form.Label>
            <Form.Control type="date" min={today()} required isInvalid={!!invalid.startDate} {...field('startDate')} />
            <Form.Control.Feedback type="invalid">{invalid.startDate}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group as={Col} md={3} controlId="leave-end">
            <Form.Label>End date</Form.Label>
            <Form.Control type="date" min={form.startDate || today()} required isInvalid={!!invalid.endDate} {...field('endDate')} />
            <Form.Control.Feedback type="invalid">{invalid.endDate}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group as={Col} md={6} controlId="leave-reason">
            <Form.Label>Reason (optional)</Form.Label>
            <Form.Control maxLength={500} {...field('reason')} />
          </Form.Group>
        </Row>
        <Button type="submit" className="mt-3" disabled={busy || !form.startDate || !form.endDate || Boolean(invalid.startDate || invalid.endDate)}>
          {busy ? 'Sending...' : 'Send request'}
        </Button>
      </Form>
    </Card>
  )
}
