import { useEffect } from 'react'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { getAccessToken } from '../api/client'

// Listens on the SignalR hub; the server sends "DutiesRevised" only to the affected faculty members.
export default function useDutiesRevised(onRevised) {
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/notifications', { accessTokenFactory: getAccessToken })
      .withAutomaticReconnect()
      .build()
    connection.on('DutiesRevised', onRevised)
    connection.start().catch(() => {})
    return () => { connection.stop() }
  }, [onRevised])
}
