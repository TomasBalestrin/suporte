import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Bethel Suporte",
    template: "%s | Bethel Suporte",
  },
  description: "Sistema de suporte inteligente com IA - Bethel Systems",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://suporte.bethelsystems.com.br"),
  openGraph: {
    title: "Bethel Suporte",
    description: "Sistema de suporte inteligente com IA",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
