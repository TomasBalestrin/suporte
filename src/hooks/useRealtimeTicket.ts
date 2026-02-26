'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ticket } from '@/lib/supabase/types'

interface UseRealtimeTicketOptions {
  ticketId: string | null
  onUpdate?: (ticket: Ticket) => void
}

const MAX_RETRIES = 5
const RETRY_BASE_MS = 2000

export function useRealtimeTicket({ ticketId, onUpdate }: UseRealtimeTicketOptions) {
  const supabase = useRef(createClient())
  const [isConnected, setIsConnected] = useState(false)
  const retryCount = useRef(0)
  const retryTimeout = useRef<NodeJS.Timeout>(undefined)

  const handleUpdate = useCallback(
    (payload: { new: Ticket }) => {
      onUpdate?.(payload.new)
    },
    [onUpdate]
  )

  useEffect(() => {
    if (!ticketId) return

    let channel: ReturnType<typeof supabase.current.channel>

    const subscribe = () => {
      channel = supabase.current
        .channel(`ticket:${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tickets',
            filter: `id=eq.${ticketId}`,
          },
          handleUpdate
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            retryCount.current = 0
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false)
            if (retryCount.current < MAX_RETRIES) {
              const delay = RETRY_BASE_MS * Math.pow(2, retryCount.current)
              retryCount.current++
              retryTimeout.current = setTimeout(() => {
                supabase.current.removeChannel(channel)
                subscribe()
              }, delay)
            }
          }
        })
    }

    subscribe()

    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current)
      supabase.current.removeChannel(channel)
      setIsConnected(false)
    }
  }, [ticketId, handleUpdate])

  return { isConnected }
}
