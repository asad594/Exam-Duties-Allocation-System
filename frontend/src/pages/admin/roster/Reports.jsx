import { Alert, Table } from 'react-bootstrap'
import useGet from '../../../api/useGet'

const time = (row) => `${row.startTime.slice(0, 5)} - ${row.endTime.slice(0, 5)}`

function Report({ url, empty, headers, cells }) {
  const { data, error } = useGet(url)
  if (error) return <Alert variant="danger">{error}</Alert>
  if (!data) return null
  if (data.length === 0) return <Alert variant="info">{empty}</Alert>
  return (
    <Table striped bordered hover responsive className="bg-white">
      <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{data.map((row, i) => <tr key={i}>{cells(row).map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </Table>
  )
}

export const Workload = ({ versionId }) => (
  <Report url={`/rosters/${versionId}/workload`} empty="No faculty members." headers={['Faculty member', 'Duties', 'Total hours']}
    cells={(w) => [w.staffName, w.duties, w.totalHours]} />
)

export const Vacancies = ({ versionId }) => (
  <Report url={`/rosters/${versionId}/vacancies`} empty="Every room has all the invigilators it needs."
    headers={['Date', 'Time', 'Course', 'Room', 'Missing', 'Unavailable', 'Busy (overlap)', 'At duty limit']}
    cells={(v) => [v.date, time(v), v.courseCode, v.room, v.missing, v.unavailableCount, v.busyCount, v.atLimitCount]} />
)

export const Audit = ({ versionId }) => (
  <Report url={`/rosters/${versionId}/audit`} empty="No changes recorded for this version."
    headers={['When', 'Action', 'By', 'Old faculty', 'New faculty', 'Slot']}
    cells={(a) => [new Date(a.at).toLocaleString(), a.action, a.actor, a.oldStaff ?? '-', a.newStaff ?? '-', a.slotId ?? '-']} />
)
