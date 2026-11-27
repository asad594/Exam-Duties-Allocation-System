import { useState } from 'react'
import { Button, Card } from 'react-bootstrap'
import CrudPage from '../../components/CrudPage'
import { labelOf } from '../../components/useLookups'

const timeRange = (item) => `${item.startTime.slice(0, 5)} - ${item.endTime.slice(0, 5)}`

const sessionFields = [
  { name: 'courseId', label: 'Course', type: 'select', numeric: true, required: true, source: { url: '/courses', label: (c) => `${c.code} - ${c.title}` } },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'startTime', label: 'Start time', type: 'time', required: true },
  { name: 'endTime', label: 'End time', type: 'time', required: true },
]
const sessionColumns = [
  { label: 'Course', render: (s, lookups) => labelOf(lookups.courseId, s.courseId) },
  { key: 'date', label: 'Date' },
  { label: 'Time', render: timeRange },
]

const slotFields = [
  { name: 'roomId', label: 'Room', type: 'select', numeric: true, required: true, source: { url: '/rooms', label: (r) => r.name } },
  { name: 'required', label: 'Invigilators required', type: 'number', required: true },
]
const slotColumns = [
  { label: 'Room', render: (s, lookups) => labelOf(lookups.roomId, s.roomId) },
  { key: 'required', label: 'Invigilators required' },
]

// An exam session is one paper at a date and time; its slots are the rooms it uses and how many invigilators each needs.
export default function SessionsPage() {
  const [selected, setSelected] = useState(null)

  const roomsButton = (session) => (
    <Button size="sm" variant={selected?.id === session.id ? 'primary' : 'outline-secondary'} className="me-2" onClick={() => setSelected(session)}>
      Rooms
    </Button>
  )

  return (
    <>
      <CrudPage title="Exam Sessions" singular="Session" endpoint="/sessions" fields={sessionFields} columns={sessionColumns} actions={roomsButton} />
      {selected && (
        <Card body className="mt-4">
          <CrudPage
            key={selected.id}
            heading={false}
            title={`Rooms for session ${selected.id} (${selected.date}, ${timeRange(selected)})`}
            singular="Room slot"
            endpoint="/slots"
            query={{ sessionId: selected.id }}
            fixed={{ examSessionId: selected.id }}
            fields={slotFields}
            columns={slotColumns}
          />
        </Card>
      )}
    </>
  )
}
