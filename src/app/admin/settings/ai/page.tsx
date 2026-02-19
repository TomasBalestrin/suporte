'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { Brain } from 'lucide-react'

export default function AISettingsPage() {
  return (
    <>
      <Header title="Configuracoes de IA" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={Brain}
              title="Configuracoes de IA"
              description="Esta funcionalidade sera implementada na Fase 3."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
