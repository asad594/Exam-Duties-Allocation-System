import { useCallback, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Alert, Button, Card, Col, Row, Tab, Tabs } from 'react-bootstrap'
import { api } from '../../../api/client'
import { errorMessage } from '../../../api/errors'
import useGet from '../../../api/useGet'
import LeaveStatusBadge from '../../../components/LeaveStatusBadge'
import { leavePeriod } from '../../../components/leavePeriod'
import { useHubEvent } from '../../../realtime/useRealtime'
import AffectedDutiesModal from './AffectedDutiesModal'
import RejectModal from './RejectModal'

function LeaveCards({ status, onApprove, onReject }) {
  const { data: requests, error, reload } = useGet(`/leave-requests?status=${status}`)
  useHubEvent('LeaveRequested', useCallback(() => status === 'Pending' && reload(), [status, reload]))

  if (error) return <Alert variant="danger">{error}</Alert>
  if (requests?.length === 0) return <Alert variant="secondary">No {status.toLowerCase()} leave requests.</Alert>
  return (
    <Row xs={1} md={2} xl={3} className="g-3">
      {requests?.map((r) => (
        <Col key={r.id}>
          <Card className="h-100" data-testid="leave-card">
            <Card.Body>
              <div className="d-flex justify-content-between mb-2"><Card.Title className="h6 mb-0">{r.staffName}</Card.Title><LeaveStatusBadge status={r.status} /></div>
              <div><strong>{leavePeriod(r)}</strong></div>
              <div className="text-muted">{r.reason ?? 'No reason given'}</div>
              {r.decisionNote && <div className="mt-2 small">Note: {r.decisionNote}</div>}
            </Card.Body>
            {status === 'Pending' && (
              <Card.Footer className="bg-white">
                <Button size="sm" variant="success" className="me-2" onClick={() => onApprove(r)}>Approve</Button>
                <Button size="sm" variant="outline-danger" onClick={() => onReject(r)}>Reject</Button>
              </Card.Footer>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  )
}

// Admin review of leave requests. Approval returns the duties now clashing with the leave.
export default function LeaveRequestsPage() {
  const { refreshPending } = useOutletContext()
  const [revision, setRevision] = useState(0)
  const [rejecting, setRejecting] = useState(null)
  const [approved, setApproved] = useState(null)
  const [message, setMessage] = useState(null)

  const decided = (text, variant = 'success') => {
    setMessage({ text, variant })
    setRevision((r) => r + 1)
    refreshPending()
  }

  async function approve(request) {
    try {
      const { data } = await api.post(`/leave-requests/${request.id}/approve`)
      decided(`Leave approved for ${request.staffName}.`)
      if (data.affectedDuties.length > 0) setApproved(data)
    } catch (err) {
      decided(errorMessage(err), 'danger')
    }
  }

  async function reject(note) {
    await api.post(`/leave-requests/${rejecting.id}/reject`, { note })
    decided(`Leave rejected for ${rejecting.staffName}.`)
    setRejecting(null)
  }

  return (
    <>
      <h1 className="h3 mb-4">Leave requests</h1>
      {message && <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Tabs defaultActiveKey="Pending" mountOnEnter unmountOnExit className="mb-3" key={revision}>
        {['Pending', 'Approved', 'Rejected'].map((status) => (
          <Tab key={status} eventKey={status} title={status}>
            <LeaveCards status={status} onApprove={approve} onReject={setRejecting} />
          </Tab>
        ))}
      </Tabs>
      {rejecting && <RejectModal request={rejecting} onReject={reject} onClose={() => setRejecting(null)} />}
      {approved && <AffectedDutiesModal result={approved} onClose={() => setApproved(null)} />}
    </>
  )
}
