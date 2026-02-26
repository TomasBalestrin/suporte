import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Carregando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-busy="true" aria-label={message}>
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
