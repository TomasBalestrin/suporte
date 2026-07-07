import type { Metadata } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

// Fontes do tema claro do Fluxon — expostas como CSS vars e consumidas
// SÓ no subtree do admin (.admin em globals.css). O portal do cliente mantém a fonte atual.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Bethel Suporte",
    template: "%s | Bethel Suporte",
  },
  description: "Sistema de suporte inteligente com IA - Bethel Systems",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://suporte.bethelsystems.com.br"),
  openGraph: {
    title: "Bethel Suporte",
    description: "Sistema de suporte inteligente com IA - Bethel Systems",
    type: "website",
    locale: "pt_BR",
    siteName: "Bethel Suporte",
  },
  twitter: {
    card: "summary",
    title: "Bethel Suporte",
    description: "Sistema de suporte inteligente com IA",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Pular para o conteúdo principal
        </a>
        <TooltipProvider>
          <main id="main-content">
            {children}
          </main>
        </TooltipProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
