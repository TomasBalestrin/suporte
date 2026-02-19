'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { HelpCircle } from 'lucide-react'

export default function UnansweredSettingsPage() {
  return (
    <>
      <Header title="Perguntas Sem Resposta" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={HelpCircle}
              title="Perguntas Sem Resposta"
              description="Esta funcionalidade sera implementada na Fase 3."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
