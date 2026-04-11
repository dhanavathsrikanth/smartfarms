import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import { Navbar } from '@/components/Navbar'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SmartFarm Core',
  description: 'Precision Agriculture Terminal',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <Navbar />
            <div className="flex-1 flex flex-col">
              {children}
            </div>
            <Toaster richColors position="top-right" />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
