import { useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { leavePeriod as period } from '../components/leavePeriod'
import { useHubEvent, useRealtime } from './useRealtime'

function AdminNotifications() {
  const { notify } = useRealtime()
  useHubEvent('LeaveRequested', useCallback((e) => notify(`${e.staffName} requested leave for ${period(e)}.`), [notify]))
  return null
}

function FacultyNotifications() {
  const { notify } = useRealtime()
  useHubEvent('LeaveDecided', useCallback((e) =>
    notify(`Your leave for ${period(e)} was ${e.status.toLowerCase()}.${e.decisionNote ? ` Note: ${e.decisionNote}` : ''}`), [notify]))
  useHubEvent('DutiesRevised', useCallback((e) => notify(e.message), [notify]))
  return null
}

// Shows a toast for live events that matter to the logged-in role.
export default function LiveNotifications() {
  const { user } = useAuth()
  return user.role === 'Admin' ? <AdminNotifications /> : <FacultyNotifications />
}
