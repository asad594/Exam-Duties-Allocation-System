import { useState } from 'react'
import { Alert, Button, Table } from 'react-bootstrap'
import { api } from '../../api/client'
import { errorMessage } from '../../api/errors'
import useGet from '../../api/useGet'
import LeaveStatusBadge from '../../components/LeaveStatusBadge'
import { leavePeriod } from '../../components/leavePeriod'
import { useHubEvent } from '../../realtime/useRealtime'
import LeaveForm from './LeaveForm'

// A faculty member's leave: request form plus their own requests; reloads live when the admin decides.
export default function LeavePage() {
  const { data: requests, error, reload } = useGet('/leave-requests/mine')
  const [actionError, setActionError] = useState('')
  useHubEvent('LeaveDecided', reload)

  async function cancel(request) {
    if (!window.confirm(`Cancel your leave request for ${leavePeriod(request)}?`)) return
    try {
      await api.delete(`/leave-requests/${request.id}`)
      setActionError('')
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">Leave</h1>
      <LeaveForm onCreated={reload} />
      <h2 className="h5 mb-3">My requests</h2>
      {(error || actionError) && <Alert variant="danger">{error || actionError}</Alert>}
      {requests?.length === 0 && <Alert variant="secondary">You have not requested any leave yet.</Alert>}
      {requests?.length > 0 && (
        <Table bordered hover responsive className="bg-white">
          <thead><tr><th>Dates</th><th>Reason</th><th>Status</th><th>Decision note</th><th>Action</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{leavePeriod(r)}</td>
                <td>{r.reason ?? '-'}</td>
                <td><LeaveStatusBadge status={r.status} /></td>
                <td>{r.decisionNote ?? '-'}</td>
                <td>{r.status === 'Pending' && <Button size="sm" variant="outline-danger" onClick={() => cancel(r)}>Cancel</Button>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
