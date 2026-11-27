import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { api } from '../../../api/client'
import { errorMessage } from '../../../api/errors'

// Swaps one invigilator. The API applies the same rules as automatic allocation and returns 422 with the reason if broken.
export default function ReplaceModal({ versionId, row, faculty, onDone, onClose }) {
  const [newStaffId, setNewStaffId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.put(`/rosters/${versionId}/assignments/${row.assignmentId}`, { newStaffId: Number(newStaffId) })
      onDone(data)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal show onHide={onClose}>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title>Replace invigilator</Modal.Title></Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            <strong>{row.courseCode}</strong>, {row.room}, {row.date} {row.startTime.slice(0, 5)} - {row.endTime.slice(0, 5)}
            <br />Current: <strong>{row.staffName}</strong>
          </p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group controlId="replace-staff">
            <Form.Label>New faculty member</Form.Label>
            <Form.Select value={newStaffId} onChange={(e) => setNewStaffId(e.target.value)} required>
              <option value="">Choose...</option>
              {faculty.filter(([id]) => id !== row.staffId).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Checking...' : 'Replace'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
