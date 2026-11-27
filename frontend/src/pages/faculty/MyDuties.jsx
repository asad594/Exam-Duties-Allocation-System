import { Alert, Table } from 'react-bootstrap'
import useGet from '../../api/useGet'
import { useHubEvent } from '../../realtime/useRealtime'

// A faculty member's duties from the latest published roster; reloads live when an admin changes them (the toast comes from LiveNotifications).
export default function MyDuties() {
  const { data: duties, error, reload } = useGet('/my-duties')
  useHubEvent('DutiesRevised', reload)

  return (
    <>
      <h1 className="h3 mb-4">My Duties</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {duties?.length === 0 && <Alert variant="secondary">You have no published duties yet.</Alert>}
      {duties?.length > 0 && (
        <Table striped bordered hover responsive className="bg-white">
          <thead><tr><th>Date</th><th>Time</th><th>Course</th><th>Room</th></tr></thead>
          <tbody>
            {duties.map((d) => (
              <tr key={d.assignmentId}>
                <td>{d.date}</td><td>{d.startTime.slice(0, 5)} - {d.endTime.slice(0, 5)}</td><td>{d.courseCode}</td><td>{d.room}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
