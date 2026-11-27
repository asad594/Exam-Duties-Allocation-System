import { createContext, useContext, useEffect } from 'react'

export const RealtimeContext = createContext({ connection: null, notify: () => {} })

export const useRealtime = () => useContext(RealtimeContext)

// Runs the handler whenever the server sends this SignalR event; the handler should be stable (useCallback).
export function useHubEvent(event, handler) {
  const { connection } = useRealtime()
  useEffect(() => {
    if (!connection) return
    connection.on(event, handler)
    return () => connection.off(event, handler)
  }, [connection, event, handler])
}
