import { useCallback, useEffect, useState } from 'react'
import { Alert, Table } from 'react-bootstrap'
import { api } from '../../api/client'
import { errorMessage } from '../../api/errors'

export default function MyDuties() {
  const [duties, setDuties] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get('/my-duties').then(({ data }) => setDuties(data)).catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(load, [load])

  return (
    <>
      <h1 className="h3 mb-4">My Duties</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {duties?.length === 0 && <Alert variant="info">You have no published duties yet.</Alert>}
      {duties?.length > 0 && (
        <Table striped bordered hover responsive>
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
