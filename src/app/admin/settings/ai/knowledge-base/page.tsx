'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { BookOpen } from 'lucide-react'

export default function KnowledgeBaseSettingsPage() {
  return (
    <>
      <Header title="Base de Conhecimento" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={BookOpen}
              title="Base de Conhecimento"
              description="Esta funcionalidade sera implementada na Fase 3."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
