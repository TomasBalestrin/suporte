import type { ReactNode } from 'react'

export default function SuporteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="portal-light">
      {children}
    </div>
  )
}
