import { useState } from 'react'
import { Alert, Badge, Button, Form, Tab, Tabs } from 'react-bootstrap'
import { api } from '../../../api/client'
import { errorMessage } from '../../../api/errors'
import useGet from '../../../api/useGet'
import { Audit, Vacancies, Workload } from './Reports'
import RosterTable from './RosterTable'

async function downloadCsv(versionId) {
  const { data } = await api.get(`/rosters/${versionId}/export`, { responseType: 'blob' })
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(data), download: `roster-v${versionId}.csv` })
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function RosterPage() {
  const { data: versions, error, reload } = useGet('/rosters')
  const [selectedId, setSelectedId] = useState(null)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const current = versions?.find((v) => v.id === selectedId) ?? versions?.at(-1)
  const latestPublished = Math.max(0, ...(versions ?? []).filter((v) => v.status === 'Published').map((v) => v.versionNo))
  const canReplace = current && (current.status === 'Draft' || current.versionNo === latestPublished)

  // Runs an action, shows its result, then reloads the version list and the tab content.
  async function act(action) {
    setBusy(true)
    try {
      const { text, variant = 'success', select } = await action()
      setMessage({ text, variant })
      if (select) setSelectedId(select)
      reload()
      setRevision((r) => r + 1)
    } catch (err) {
      setMessage({ text: errorMessage(err), variant: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const generate = () => act(async () => {
    const { data } = await api.post('/rosters/generate')
    const vacancies = `${data.vacancyCount} ${data.vacancyCount === 1 ? 'vacancy' : 'vacancies'}`
    return { text: `Draft generated: ${data.assignedCount} duties assigned, ${vacancies} (${data.elapsedMs} ms).`, select: data.draftId }
  })

  const publish = () => window.confirm('Publish this roster? Faculty will be able to see it.') && act(async () => {
    const { data } = await api.post(`/rosters/${current.id}/publish`)
    const warning = data.vacancyWarning ? ` Warning: ${data.vacancyWarning} slot(s) still have vacancies.` : ''
    return { text: `Published as version ${data.versionNo}.${warning}`, variant: warning ? 'warning' : 'success', select: data.rosterVersionId }
  })

  const replaced = (result) => act(async () => ({
    text: result.rosterVersionId === current.id
      ? 'Invigilator replaced in the draft.'
      : `Published roster changed: version ${result.versionNo} created and affected faculty notified.`,
    select: result.rosterVersionId,
  }))

  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
        <h1 className="h3 mb-0 me-auto">Roster</h1>
        {versions?.length > 0 && (
          <Form.Group controlId="version">
            <Form.Label className="small mb-1">Version</Form.Label>
            <Form.Select value={current.id} onChange={(e) => setSelectedId(Number(e.target.value))}>
              {versions.map((v) => <option key={v.id} value={v.id}>Version {v.versionNo} - {v.status}</option>)}
            </Form.Select>
          </Form.Group>
        )}
        <Button onClick={generate} disabled={busy}>Generate draft</Button>
        {current?.status === 'Draft' && <Button variant="success" onClick={publish} disabled={busy}>Publish</Button>}
        {current && <Button variant="outline-secondary" onClick={() => downloadCsv(current.id).catch((e) => setMessage({ text: errorMessage(e), variant: 'danger' }))}>Export CSV</Button>}
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>{message.text}</Alert>}
      {versions?.length === 0 && <Alert variant="info">No roster yet. Click <strong>Generate draft</strong> to allocate duties automatically.</Alert>}
      {current && (
        <>
          <p>Showing <strong>version {current.versionNo}</strong> <Badge bg={current.status === 'Draft' ? 'secondary' : 'success'}>{current.status}</Badge>
            {!canReplace && <span className="text-muted ms-2">(older published version - read only)</span>}</p>
          <Tabs defaultActiveKey="roster" mountOnEnter unmountOnExit className="mb-3" key={`${current.id}-${revision}`}>
            <Tab eventKey="roster" title="Roster"><RosterTable versionId={current.id} canReplace={canReplace} onChanged={replaced} /></Tab>
            <Tab eventKey="workload" title="Workload"><Workload versionId={current.id} /></Tab>
            <Tab eventKey="vacancies" title="Vacancies"><Vacancies versionId={current.id} /></Tab>
            <Tab eventKey="audit" title="Audit trail"><Audit versionId={current.id} /></Tab>
          </Tabs>
        </>
      )}
    </>
  )
}
