import { useState } from 'react'
import { Alert, Button, Col, Form, Row, Table } from 'react-bootstrap'
import useGet from '../../../api/useGet'
import useLookups from '../../../components/useLookups'
import ReplaceModal from './ReplaceModal'

const filterSources = [
  { name: 'staffId', source: { url: '/staff', where: (s) => s.role === 'Faculty', label: (s) => s.name } },
  { name: 'roomId', source: { url: '/rooms', label: (r) => r.name } },
]

// The roster view with optional faculty / date / room filters (sent to the API as query parameters).
export default function RosterTable({ versionId, canReplace, onChanged }) {
  const [filter, setFilter] = useState({ staffId: '', date: '', roomId: '' })
  const [replacing, setReplacing] = useState(null)
  const { staffId: faculty = [], roomId: rooms = [] } = useLookups(filterSources)
  const query = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString()
  const { data: rows, error } = useGet(`/rosters/${versionId}${query ? `?${query}` : ''}`)

  const select = (name, label, options, all) => (
    <Form.Group as={Col} md={3} controlId={`filter-${name}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Select value={filter[name]} onChange={(e) => setFilter({ ...filter, [name]: e.target.value })}>
        <option value="">{all}</option>
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </Form.Select>
    </Form.Group>
  )

  return (
    <>
      <Row className="g-3 mb-3">
        {select('staffId', 'Faculty member', faculty, 'All faculty')}
        <Form.Group as={Col} md={3} controlId="filter-date">
          <Form.Label>Date</Form.Label>
          <Form.Control type="date" value={filter.date} onChange={(e) => setFilter({ ...filter, date: e.target.value })} />
        </Form.Group>
        {select('roomId', 'Room', rooms, 'All rooms')}
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {rows && (
        <Table striped bordered hover responsive className="bg-white">
          <thead><tr><th>Date</th><th>Time</th><th>Course</th><th>Room</th><th>Faculty member</th>{canReplace && <th>Action</th>}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="text-center text-muted">No duties match these filters.</td></tr>}
            {rows.map((r) => (
              <tr key={r.assignmentId}>
                <td>{r.date}</td><td>{r.startTime.slice(0, 5)} - {r.endTime.slice(0, 5)}</td><td>{r.courseCode}</td><td>{r.room}</td><td>{r.staffName}</td>
                {canReplace && <td><Button size="sm" variant="outline-primary" onClick={() => setReplacing(r)}>Replace</Button></td>}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {replacing && (
        <ReplaceModal versionId={versionId} row={replacing} faculty={faculty} onClose={() => setReplacing(null)}
          onDone={(result) => { setReplacing(null); onChanged(result) }} />
      )}
    </>
  )
}
