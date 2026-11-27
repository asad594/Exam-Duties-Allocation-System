import { useEffect, useState } from 'react'
import { api } from '../api/client'

// Loads dropdown options for fields with a "source", e.g. { url: '/rooms', label: (r) => r.name }.
// Result: { fieldName: [[id, label], ...] }. Field configs must be module constants so this runs once.
export default function useLookups(fields) {
  const [lookups, setLookups] = useState({})

  useEffect(() => {
    const sourced = fields.filter((f) => f.source)
    Promise.all(sourced.map((f) => api.get(f.source.url)))
      .then((responses) => setLookups(Object.fromEntries(sourced.map((f, i) =>
        [f.name, responses[i].data.filter(f.source.where ?? (() => true)).map((item) => [item.id, f.source.label(item)])]))))
      .catch(() => setLookups({}))
  }, [fields])

  return lookups
}

export const labelOf = (options, id) => options?.find(([value]) => value === id)?.[1] ?? id
