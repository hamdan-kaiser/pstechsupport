'use client'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { COLOR } from '@/lib/design'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: COLOR.toastBg, color: COLOR.toastText, border: `1px solid ${COLOR.toastBorder}` },
          success: { iconTheme: { primary: COLOR.toastSuccess, secondary: COLOR.toastWhite } },
          error: { iconTheme: { primary: COLOR.toastError, secondary: COLOR.toastWhite } },
        }}
      />
    </SessionProvider>
  )
}
