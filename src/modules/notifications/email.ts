import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465, // true for SSL (465), STARTTLS otherwise
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null

/** Emails every admin in addition to their in-app notification — used for leave-type requests
 *  (Holiday, Sick, Sudden Leave, Late Arrival) so admins don't have to be logged in to notice
 *  one. Silently no-ops if SMTP isn't configured, and never throws — a delivery failure here
 *  must never block the actual request submission. */
export async function notifyAdminsByEmail(subject: string, bodyLines: string[], linkPath?: string) {
  if (!transporter) {
    console.warn('notifyAdminsByEmail: SMTP not configured, skipping email notification')
    return
  }

  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { email: true } })
    const to = admins.map(a => a.email).filter(Boolean)
    if (to.length === 0) return

    const baseUrl = process.env.NEXTAUTH_URL
    const link = linkPath && baseUrl ? `${baseUrl}${linkPath}` : null

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px;">
        <h2 style="margin: 0 0 12px;">${subject}</h2>
        ${bodyLines.map(line => `<p style="margin: 0 0 8px; color: #334155;">${line}</p>`).join('')}
        ${link ? `<p style="margin-top: 16px;"><a href="${link}" style="color: #2563eb;">Review in Team Portal →</a></p>` : ''}
      </div>
    `.trim()

    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('notifyAdminsByEmail failed:', err)
  }
}
