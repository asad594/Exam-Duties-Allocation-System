import { useNavigate } from 'react-router-dom'
import { Button, Modal, Table } from 'react-bootstrap'

// Shown after an approval when the faculty member already had duties on those days.
export default function AffectedDutiesModal({ result, onClose }) {
  const navigate = useNavigate()
  const { request, affectedDuties } = result
  // Prefer the published version: that is what faculty see and what needs a replacement first.
  const target = affectedDuties.find((d) => d.versionStatus === 'Published') ?? affectedDuties[0]

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton><Modal.Title>Duties affected by this leave</Modal.Title></Modal.Header>
      <Modal.Body>
        <p><strong>{request.staffName}</strong> is now unavailable on these days but still has these duties. Replace them in the roster.</p>
        <Table bordered size="sm">
          <thead><tr><th>Roster</th><th>Date</th><th>Time</th><th>Course</th><th>Room</th></tr></thead>
          <tbody>
            {affectedDuties.map((d) => (
              <tr key={`${d.rosterVersionId}-${d.assignmentId}`}>
                <td>Version {d.versionNo} ({d.versionStatus})</td><td>{d.date}</td>
                <td>{d.startTime.slice(0, 5)} - {d.endTime.slice(0, 5)}</td><td>{d.courseCode}</td><td>{d.room}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Later</Button>
        <Button onClick={() => navigate(`/admin/roster?version=${target.rosterVersionId}&staffId=${request.staffId}`)}>Go to roster</Button>
      </Modal.Footer>
    </Modal>
  )
}
