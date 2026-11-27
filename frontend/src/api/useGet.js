import { useCallback, useEffect, useState } from 'react'
import { api } from './client'
import { errorMessage } from './errors'

// Loads a URL whenever it changes; returns the data, an error message and a reload function.
export default function useGet(url) {
  const [state, setState] = useState({ data: null, error: '' })

  const reload = useCallback(() => {
    api.get(url)
      .then(({ data }) => setState({ data, error: '' }))
      .catch((err) => setState({ data: null, error: errorMessage(err) }))
  }, [url])

  useEffect(reload, [reload])

  return { ...state, reload }
}
