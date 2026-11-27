import { useCallback, useState } from 'react'
import { Alert, Table } from 'react-bootstrap'
import useGet from '../../api/useGet'
import useDutiesRevised from '../../realtime/useDutiesRevised'

// A faculty member's duties from the latest published roster; refreshes live when an admin changes them.
export default function MyDuties() {
  const { data: duties, error, reload } = useGet('/my-duties')
  const [notice, setNotice] = useState('')

  const onRevised = useCallback((event) => {
    setNotice(event.message)
    reload()
  }, [reload])

  useDutiesRevised(onRevised)

  return (
    <>
      <h1 className="h3 mb-4">My Duties</h1>
      {notice && <Alert variant="info" dismissible onClose={() => setNotice('')}>{notice}</Alert>}
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
