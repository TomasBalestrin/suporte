'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/supabase/types'

interface UseRealtimeMessagesOptions {
  ticketId: string | null
  onNewMessage?: (message: Message) => void
}

const MAX_RETRIES = 5
const RETRY_BASE_MS = 2000

export function useRealtimeMessages({ ticketId, onNewMessage }: UseRealtimeMessagesOptions) {
  const supabase = useRef(createClient())
  const [isConnected, setIsConnected] = useState(false)
  const [hasConnectionError, setHasConnectionError] = useState(false)
  const retryCount = useRef(0)
  const retryTimeout = useRef<NodeJS.Timeout>(undefined)

  const handleInsert = useCallback(
    (payload: { new: Message }) => {
      onNewMessage?.(payload.new)
    },
    [onNewMessage]
  )

  useEffect(() => {
    if (!ticketId) return

    let channel: ReturnType<typeof supabase.current.channel>

    const subscribe = () => {
      channel = supabase.current
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
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setHasConnectionError(false)
            retryCount.current = 0
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false)
            // Auto-retry with exponential backoff
            if (retryCount.current < MAX_RETRIES) {
              const delay = RETRY_BASE_MS * Math.pow(2, retryCount.current)
              retryCount.current++
              retryTimeout.current = setTimeout(() => {
                supabase.current.removeChannel(channel)
                subscribe()
              }, delay)
            } else {
              setHasConnectionError(true)
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
  }, [ticketId, handleInsert])

  const reconnect = useCallback(() => {
    retryCount.current = 0
    setHasConnectionError(false)
  }, [])

  return { isConnected, hasConnectionError, reconnect }
}
