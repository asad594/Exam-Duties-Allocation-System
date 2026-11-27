import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { errorMessage } from '../../../api/errors'
import { leavePeriod } from '../../../components/leavePeriod'

export default function RejectModal({ request, onReject, onClose }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await onReject(note || null)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal show onHide={onClose}>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title>Reject leave</Modal.Title></Modal.Header>
        <Modal.Body>
          <p><strong>{request.staffName}</strong>, {leavePeriod(request)}</p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group controlId="reject-note">
            <Form.Label>Note for the faculty member (optional)</Form.Label>
            <Form.Control as="textarea" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={busy}>{busy ? 'Rejecting...' : 'Reject'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
