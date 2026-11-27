import { useEffect, useState } from 'react'
import { api, clearTokens, getRefreshToken, refreshTokens, setSessionExpiredHandler, setTokens } from '../api/client'
import { AuthContext } from './useAuth'

// The JWT payload carries "sub" (user id) and "role"; no extra request is needed to know who is logged in.
function userFromToken(token) {
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  return { id: Number(payload.sub), role: payload.role }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    if (!getRefreshToken()) { setReady(true); return }
    refreshTokens()
      .then((tokens) => setUser(userFromToken(tokens.accessToken)))
      .catch(clearTokens)
      .finally(() => setReady(true))
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    setTokens(data)
    const loggedIn = userFromToken(data.accessToken)
    setUser(loggedIn)
    return loggedIn
  }

  async function logout() {
    const refreshToken = getRefreshToken()
    clearTokens()
    setUser(null)
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => {})
  }

  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>
}
