import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if ((session!.user as any).role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Portal configuration</p>
      </div>
      <div className="card">
        <h2 className="font-semibold text-white mb-4">About</h2>
        <div className="space-y-3 text-sm text-slate-400">
          <p>Team Portal v1.0.0</p>
          <p>Built with Next.js 14, Prisma, NextAuth, GSAP, Tailwind CSS</p>
          <p>Default employee password: <span className="font-mono text-slate-300">password123</span></p>
        </div>
      </div>
    </div>
  )
}
