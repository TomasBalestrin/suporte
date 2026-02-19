'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { Clock } from 'lucide-react'

export default function SLASettingsPage() {
  return (
    <>
      <Header title="SLA" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={Clock}
              title="SLA"
              description="Esta funcionalidade sera implementada na Fase 4."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
