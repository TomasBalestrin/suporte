'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { MessageSquareText } from 'lucide-react'

export default function QuickRepliesSettingsPage() {
  return (
    <>
      <Header title="Respostas Rapidas" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={MessageSquareText}
              title="Respostas Rapidas"
              description="Esta funcionalidade sera implementada na Fase 4."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
