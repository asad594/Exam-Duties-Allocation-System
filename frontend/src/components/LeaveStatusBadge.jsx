import { Badge } from 'react-bootstrap'

const colours = { Pending: ['warning', 'dark'], Approved: ['success', 'light'], Rejected: ['danger', 'light'] }

export default function LeaveStatusBadge({ status }) {
  const [bg, text] = colours[status]
  return <Badge bg={bg} text={text}>{status}</Badge>
}
