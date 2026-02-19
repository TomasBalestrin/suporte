'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { Zap } from 'lucide-react'

export default function AutomationsSettingsPage() {
  return (
    <>
      <Header title="Automacoes" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={Zap}
              title="Automacoes"
              description="Esta funcionalidade sera implementada na Fase 5."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
