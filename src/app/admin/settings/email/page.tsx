'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { Mail } from 'lucide-react'

export default function EmailSettingsPage() {
  return (
    <>
      <Header title="Email" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={Mail}
              title="Email"
              description="Esta funcionalidade sera implementada na Fase 2."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
