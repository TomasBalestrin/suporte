'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { TagIcon } from 'lucide-react'

export default function TagsSettingsPage() {
  return (
    <>
      <Header title="Tags" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardContent className="p-12">
            <EmptyState
              icon={TagIcon}
              title="Tags"
              description="Esta funcionalidade sera implementada na Fase 4."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
