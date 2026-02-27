'use client'

export default function TicketsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <h2 className="text-xl font-semibold text-destructive">Erro ao carregar tickets</h2>
      <p className="mt-2 text-sm text-muted-foreground">Não foi possível carregar a lista de tickets. Tente novamente.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Tentar novamente
      </button>
    </div>
  )
}
