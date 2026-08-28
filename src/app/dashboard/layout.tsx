import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={(session.user as any).role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={session.user as any} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative" style={{ backgroundColor: 'var(--bg-base)' }}>
          <div className="techy-scanlines fixed inset-0 pointer-events-none" />
          {children}
          <footer className="mt-8 pt-4 border-t text-center" style={{ borderColor: 'var(--border-base)' }}>
            <span className="glow-credit">Designed and Developed by Hamdan Kaiser</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
