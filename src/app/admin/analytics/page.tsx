'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <>
      <Header title="Analytics" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={BarChart3}
              title="Dashboard Analitico"
              description="O dashboard analitico completo com metricas operacionais, de IA, satisfacao, SLA e performance dos agentes sera implementado na Fase 5."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
