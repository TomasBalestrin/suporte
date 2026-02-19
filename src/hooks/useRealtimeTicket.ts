'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ticket } from '@/lib/supabase/types'

interface UseRealtimeTicketOptions {
  ticketId: string | null
  onUpdate?: (ticket: Ticket) => void
}

export function useRealtimeTicket({ ticketId, onUpdate }: UseRealtimeTicketOptions) {
  const supabase = useRef(createClient())

  const handleUpdate = useCallback(
    (payload: { new: Ticket }) => {
      onUpdate?.(payload.new)
    },
    [onUpdate]
  )

  useEffect(() => {
    if (!ticketId) return

    const channel = supabase.current
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
      .subscribe()

    return () => {
      supabase.current.removeChannel(channel)
    }
  }, [ticketId, handleUpdate])
}
