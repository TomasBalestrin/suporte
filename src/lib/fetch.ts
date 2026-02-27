/**
 * Wrapper around fetch that automatically includes the CSRF token
 * for mutating requests (POST, PUT, PATCH, DELETE) to admin API routes.
 */

let csrfToken: string | null = null
let csrfPromise: Promise<string> | null = null

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken

  if (!csrfPromise) {
    csrfPromise = fetch('/api/csrf')
      .then((res) => res.json())
      .then((data) => {
        csrfToken = data.token
        return data.token as string
      })
      .catch(() => '')
  }

  return csrfPromise
}

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

export async function adminFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase()

  if (MUTATING_METHODS.includes(method)) {
    const token = await getCsrfToken()
    const headers = new Headers(init?.headers)
    if (token) {
      headers.set('x-csrf-token', token)
    }
    const response = await fetch(input, { ...init, headers })

    // If CSRF token expired, refresh and retry once
    if (response.status === 403) {
      const body = await response.clone().json().catch(() => null)
      if (body?.error?.toLowerCase().includes('csrf')) {
        resetCsrfToken()
        const newToken = await getCsrfToken()
        const retryHeaders = new Headers(init?.headers)
        if (newToken) {
          retryHeaders.set('x-csrf-token', newToken)
        }
        return fetch(input, { ...init, headers: retryHeaders })
      }
    }

    return response
  }

  return fetch(input, init)
}

/**
 * Reset cached CSRF token (e.g. after logout).
 */
export function resetCsrfToken() {
  csrfToken = null
  csrfPromise = null
}
