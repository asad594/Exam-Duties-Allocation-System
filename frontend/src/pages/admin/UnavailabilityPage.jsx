import { useState } from 'react'
import { Form } from 'react-bootstrap'
import CrudPage from '../../components/CrudPage'
import useLookups, { labelOf } from '../../components/useLookups'

const facultySource = { url: '/staff', where: (s) => s.role === 'Faculty', label: (s) => s.name }

const fields = [
  { name: 'staffId', label: 'Faculty member', type: 'select', numeric: true, required: true, source: facultySource },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'startTime', label: 'From', type: 'time', required: true },
  { name: 'endTime', label: 'To', type: 'time', required: true },
]
const columns = [
  { label: 'Faculty member', render: (u, lookups) => labelOf(lookups.staffId, u.staffId) },
  { key: 'date', label: 'Date' },
  { label: 'From', render: (u) => u.startTime.slice(0, 5) },
  { label: 'To', render: (u) => u.endTime.slice(0, 5) },
]
const filterFields = [{ name: 'staffId', source: facultySource }]

// Times when a faculty member cannot invigilate. A whole day is 00:00 to 23:59.
export default function UnavailabilityPage() {
  const [staffId, setStaffId] = useState('')
  const { staffId: faculty = [] } = useLookups(filterFields)

  return (
    <>
      <Form.Group className="mb-3" style={{ maxWidth: 320 }} controlId="filter-staff">
        <Form.Label>Show unavailability for</Form.Label>
        <Form.Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">All faculty</option>
          {faculty.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Form.Select>
      </Form.Group>
      <CrudPage title="Unavailability" singular="Unavailability" endpoint="/unavailabilities" query={{ staffId }} fields={fields} columns={columns} />
    </>
  )
}
