import { useCallback, useEffect, useState } from 'react'
import { Toast, ToastContainer } from 'react-bootstrap'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { getAccessToken } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { RealtimeContext } from './useRealtime'

// One SignalR connection per logged-in user, shared by every page, plus the toast area for live messages.
export default function RealtimeProvider({ children }) {
  const { user } = useAuth()
  const [connection, setConnection] = useState(null)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    if (!user) return
    const hub = new HubConnectionBuilder()
      .withUrl('/hubs/notifications', { accessTokenFactory: getAccessToken })
      .withAutomaticReconnect()
      .build()
    hub.start().catch(() => {})
    setConnection(hub)
    return () => { hub.stop(); setConnection(null) }
  }, [user])

  const notify = useCallback((text) => setToasts((list) => [...list, { id: crypto.randomUUID(), text }]), [])
  const dismiss = (id) => setToasts((list) => list.filter((t) => t.id !== id))

  return (
    <RealtimeContext.Provider value={{ connection, notify }}>
      {children}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 2000 }}>
        {toasts.map((t) => (
          <Toast key={t.id} onClose={() => dismiss(t.id)} delay={8000} autohide bg="light">
            <Toast.Header><strong className="me-auto">EDAS</strong>just now</Toast.Header>
            <Toast.Body>{t.text}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </RealtimeContext.Provider>
  )
}
