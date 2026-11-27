// Turns any API error into one readable sentence for the user.
export function errorMessage(error) {
  const response = error?.response
  if (!response) return 'Cannot reach the server. Is the API running on port 5080?'
  const { status, data } = response
  if (status === 422) return data.reason
  if (status === 400 && data?.errors) return Object.values(data.errors).flat().join(' ')
  if (status === 403) return 'You are not allowed to do this.'
  return data?.title ?? `Request failed (${status}).`
}
