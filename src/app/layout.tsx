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
              const raw = localStorage.getItem('portal-theme')
              const parsed = JSON.parse(raw || '{}')
              const theme = parsed.state?.theme || 'dark'
              let darkBgIndex = parsed.state?.darkBgIndex
              if (darkBgIndex === undefined || darkBgIndex === null) {
                darkBgIndex = Math.floor(Math.random() * 3)
                localStorage.setItem('portal-theme', JSON.stringify({ state: { ...(parsed.state || {}), theme, darkBgIndex }, version: parsed.version ?? 0 }))
              }
              document.documentElement.classList.remove('dark', 'light')
              document.documentElement.classList.add(theme)
              if (theme === 'dark') document.documentElement.setAttribute('data-dark-bg', String(darkBgIndex))
            } catch(e) {
              document.documentElement.classList.remove('dark', 'light')
              document.documentElement.classList.add('dark')
              document.documentElement.setAttribute('data-dark-bg', String(Math.floor(Math.random() * 3)))
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
