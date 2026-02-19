'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/supabase/types'

interface UseRealtimeMessagesOptions {
  ticketId: string | null
  onNewMessage?: (message: Message) => void
}

export function useRealtimeMessages({ ticketId, onNewMessage }: UseRealtimeMessagesOptions) {
  const supabase = useRef(createClient())
  const [isConnected, setIsConnected] = useState(false)

  const handleInsert = useCallback(
    (payload: { new: Message }) => {
      onNewMessage?.(payload.new)
    },
    [onNewMessage]
  )

  useEffect(() => {
    if (!ticketId) return

    const channel = supabase.current
      .channel(`messages:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        handleInsert
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.current.removeChannel(channel)
      setIsConnected(false)
    }
  }, [ticketId, handleInsert])

  return { isConnected }
}
