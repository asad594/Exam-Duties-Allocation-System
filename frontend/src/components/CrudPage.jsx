import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Table } from 'react-bootstrap'
import { api } from '../api/client'
import { errorMessage } from '../api/errors'
import FormModal from './FormModal'
import useLookups from './useLookups'

// API values -> form strings (times shown as HH:mm, passwords never pre-filled).
function toForm(fields, item) {
  return Object.fromEntries(fields.map(({ name, type }) => {
    if (!item || type === 'password') return [name, '']
    const value = item[name] ?? ''
    return [name, type === 'time' ? String(value).slice(0, 5) : String(value)]
  }))
}

// One generic list/add/edit/delete screen, configured per resource (mirrors the back end's CrudController).
export default function CrudPage({ title, singular, endpoint, columns, fields, query = {}, fixed = {}, heading = true }) {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const lookups = useLookups(fields)
  const queryString = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString()
  const url = queryString ? `${endpoint}?${queryString}` : endpoint

  const load = useCallback(() => {
    api.get(url).then(({ data }) => setItems(data)).catch((err) => setError(errorMessage(err)))
  }, [url])

  useEffect(load, [load])

  async function save(body) {
    const payload = { ...body, ...fixed }
    if (editing.item) await api.put(`${endpoint}/${editing.item.id}`, payload)
    else await api.post(endpoint, payload)
    setEditing(null)
    setError('')
    load()
  }

  async function remove(item) {
    if (!window.confirm(`Delete this ${singular.toLowerCase()}?`)) return
    try {
      await api.delete(`${endpoint}/${item.id}`)
      setError('')
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        {heading ? <h1 className="h3 mb-0">{title}</h1> : <h2 className="h5 mb-0">{title}</h2>}
        <Button onClick={() => setEditing({ item: null })}>Add {singular}</Button>
      </div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      <Table striped bordered hover responsive className="bg-white">
        <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th style={{ width: 150 }}>Actions</th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={columns.length + 1} className="text-muted text-center">No records yet.</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              {columns.map((c) => <td key={c.label}>{c.render ? c.render(item, lookups) : item[c.key]}</td>)}
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => setEditing({ item })}>Edit</Button>
                <Button size="sm" variant="outline-danger" onClick={() => remove(item)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {editing && (
        <FormModal
          title={`${editing.item ? 'Edit' : 'Add'} ${singular}`}
          fields={fields}
          initial={toForm(fields, editing.item)}
          lookups={lookups}
          isNew={!editing.item}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
