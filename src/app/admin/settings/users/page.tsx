'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { Users } from 'lucide-react'

export default function UsersSettingsPage() {
  return (
    <>
      <Header title="Usuarios" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={Users}
              title="Usuarios"
              description="Esta funcionalidade sera implementada na Fase 4."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
