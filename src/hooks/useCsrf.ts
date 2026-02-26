'use client'

import { useEffect, useState } from 'react'

/**
 * Hook that fetches and caches a CSRF token for use in mutating API requests.
 * Include the token as `x-csrf-token` header in POST/PUT/PATCH/DELETE requests.
 */
export function useCsrf() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/csrf')
      .then((res) => res.json())
      .then((data) => setToken(data.token))
      .catch(() => {})
  }, [])

  return token
}
