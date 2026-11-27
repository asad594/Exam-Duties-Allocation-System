import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { errorMessage } from '../api/errors'

// Converts form strings to the types the API expects; empty optional fields become null.
function toBody(fields, values) {
  return Object.fromEntries(fields.map(({ name, type, numeric }) => {
    const value = values[name] ?? ''
    if (value === '') return [name, null]
    if (type === 'number' || numeric) return [name, Number(value)]
    if (type === 'time' && value.length === 5) return [name, `${value}:00`]
    return [name, value]
  }))
}

export default function FormModal({ title, fields, initial, lookups, isNew, onSubmit, onClose }) {
  // The modal is mounted fresh each time it opens, so "initial" is read only once.
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit(toBody(fields, values))
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const input = (field) => {
    const props = {
      value: values[field.name] ?? '',
      onChange: (e) => setValues({ ...values, [field.name]: e.target.value }),
      required: field.required || (isNew && field.requiredOnCreate),
    }
    if (field.type !== 'select') return <Form.Control type={field.type} placeholder={field.placeholder} {...props} />
    const options = field.options ?? lookups[field.name] ?? []
    return (
      <Form.Select {...props}>
        <option value="">Choose...</option>
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Form.Select>
    )
  }

  return (
    <Modal show onHide={onClose}>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title>{title}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {fields.map((field) => (
            <Form.Group key={field.name} className="mb-3" controlId={`field-${field.name}`}>
              <Form.Label>{field.label}</Form.Label>
              {input(field)}
            </Form.Group>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
