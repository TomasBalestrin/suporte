'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '@/lib/fetch'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Search, Users, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, Ticket } from 'lucide-react'
import { formatRelativeTime, formatPhone } from '@/lib/utils/format'

interface CustomerRow {
  id: string
  name: string
  email: string
  cpf: string | null
  phone: string | null
  created_at: string
  ticket_count: number
  open_ticket_count: number
  last_ticket_at: string | null
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setSearch(value); setPage(1) }, 400)
  }

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)

      const res = await adminFetch(`/api/admin/customers?${params}`)
      const json = await res.json()

      if (json.success) {
        setCustomers(json.data)
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages)
          setTotal(json.pagination.total)
        }
      } else {
        setHasError(true)
      }
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function formatCpf(cpf: string | null): string {
    if (!cpf) return '-'
    const clean = cpf.replace(/\D/g, '')
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
    }
    return cpf
  }

  return (
    <>
      <Header title="Clientes" />
      <div className="p-4 md:p-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>
                Lista de Clientes
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({total} clientes)
                </span>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail ou CPF..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="bg-muted pl-9 w-full sm:w-[280px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
                <p className="mb-4 text-muted-foreground">Erro ao carregar clientes</p>
                <Button variant="outline" onClick={loadCustomers} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : isLoading ? (
              <LoadingState />
            ) : customers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum cliente encontrado"
                description="Ajuste a busca ou aguarde novos clientes"
              />
            ) : (
              <>
                {/* Mobile: lista de cards (< md) */}
                <div className="flex flex-col gap-2 md:hidden">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 min-h-[44px]"
                    >
                      {/* Avatar + nome + email */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                          {customer.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{customer.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
                        </div>
                      </div>
                      {/* Contadores + último contato */}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Ticket className="h-3.5 w-3.5" aria-hidden />
                            {customer.ticket_count}
                          </span>
                          {customer.open_ticket_count > 0 ? (
                            <span className="font-semibold text-yellow-500">
                              {customer.open_ticket_count} abertos
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0 abertos</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {customer.last_ticket_at ? formatRelativeTime(customer.last_ticket_at) : '-'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Desktop: tabela (>= md) */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="text-center">Tickets</TableHead>
                        <TableHead className="text-center">Abertos</TableHead>
                        <TableHead>Último contato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/admin/customers/${customer.id}`)}
                          tabIndex={0}
                          role="link"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              router.push(`/admin/customers/${customer.id}`)
                            }
                          }}
                        >
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {formatCpf(customer.cpf)}
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                            {customer.phone ? formatPhone(customer.phone) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Ticket className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                              {customer.ticket_count}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums">
                            {customer.open_ticket_count > 0 ? (
                              <span className="font-semibold text-yellow-500">{customer.open_ticket_count}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {customer.last_ticket_at ? formatRelativeTime(customer.last_ticket_at) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="Página anterior"
                      className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      aria-label="Próxima página"
                      className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
