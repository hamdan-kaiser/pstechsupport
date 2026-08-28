import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Team Portal',
  description: 'Employee management portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const t = JSON.parse(localStorage.getItem('portal-theme') || '{}')
              document.documentElement.classList.remove('dark', 'light')
              document.documentElement.classList.add(t.state?.theme || 'dark')
            } catch(e) {
              document.documentElement.classList.remove('dark', 'light')
              document.documentElement.classList.add('dark')
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
