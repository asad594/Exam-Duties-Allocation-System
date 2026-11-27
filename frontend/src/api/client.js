import axios from 'axios'

const REFRESH_KEY = 'edas.refreshToken'
let accessToken = null
let onSessionExpired = () => {}
let refreshing = null

export const api = axios.create({ baseURL: '/api' })

export const getAccessToken = () => accessToken
export const getRefreshToken = () => sessionStorage.getItem(REFRESH_KEY)
export const setSessionExpiredHandler = (handler) => { onSessionExpired = handler }

export function setTokens(tokens) {
  accessToken = tokens.accessToken
  sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken)
}

export function clearTokens() {
  accessToken = null
  sessionStorage.removeItem(REFRESH_KEY)
}

// Refresh tokens are single use, so parallel 401s must share one refresh call.
export function refreshTokens() {
  refreshing ??= axios.post('/api/auth/refresh', { refreshToken: getRefreshToken() })
    .then(({ data }) => { setTokens(data); return data })
    .finally(() => { refreshing = null })
  return refreshing
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config
  if (error.response?.status !== 401 || original.retried || !getRefreshToken()) throw error
  original.retried = true
  try {
    await refreshTokens()
  } catch {
    clearTokens()
    onSessionExpired()
    throw error
  }
  return api(original)
})
