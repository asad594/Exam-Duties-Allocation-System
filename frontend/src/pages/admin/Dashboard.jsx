import { useEffect, useState } from 'react'
import { Alert, Card, Col, Row } from 'react-bootstrap'
import { api } from '../../api/client'
import { errorMessage } from '../../api/errors'

const counters = [
  ['Faculty', '/staff', (list) => list.filter((s) => s.role === 'Faculty').length],
  ['Rooms', '/rooms', (list) => list.length],
  ['Courses', '/courses', (list) => list.length],
  ['Exam sessions', '/sessions', (list) => list.length],
  ['Exam slots', '/slots', (list) => list.length],
]

export default function Dashboard() {
  const [counts, setCounts] = useState([])
  const [latest, setLatest] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([...counters.map(([, url]) => api.get(url)), api.get('/rosters')])
      .then((responses) => {
        setCounts(counters.map(([label, , count], i) => [label, count(responses[i].data)]))
        setLatest(responses.at(-1).data.at(-1) ?? null)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [])

  return (
    <>
      <h1 className="h3 mb-4">Dashboard</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row xs={2} md={3} lg={6} className="g-3 mb-4">
        {counts.map(([label, value]) => (
          <Col key={label}>
            <Card body className="text-center">
              <div className="display-6">{value}</div>
              <div className="text-muted">{label}</div>
            </Card>
          </Col>
        ))}
      </Row>
      <Card body>
        <strong>Roster: </strong>
        {latest ? `version ${latest.versionNo} (${latest.status})` : 'not generated yet - open Roster and click Generate.'}
      </Card>
    </>
  )
}
