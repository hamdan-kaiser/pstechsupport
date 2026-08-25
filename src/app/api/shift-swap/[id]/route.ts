import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, notifyAllAdmins, notifyAllEmployees } from '@/lib/notifications'
import { markTimetableRange } from '@/lib/timetableRange'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role
  const { action } = await req.json() // 'accept' | 'reject' | 'admin_approve' | 'admin_reject'

  const swap = await prisma.shiftSwap.findUnique({
    where: { id: params.id },
    include: {
      requester: { select: { name: true } },
      target: { select: { name: true } },
    },
  })
  if (!swap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Target employee accepting/rejecting
  if (action === 'accept' && swap.targetId === userId) {
    await prisma.shiftSwap.update({ where: { id: params.id }, data: { targetAccepted: true } })
    await notifyAllAdmins(
      'Shift Swap Awaiting Approval 🔄',
      `${swap.requester.name} and ${swap.target.name} have both agreed to swap shifts on ${new Date(swap.swapDate).toLocaleDateString()}. Please review.`,
      'warning',
      { refType: 'shiftswap-approve', refId: swap.id }
    )
    await createNotification(swap.requesterId, 'Swap Accepted ✅', `${swap.target.name} accepted your shift swap request. Waiting for admin approval.`, 'success')
    return NextResponse.json({ ok: true })
  }

  if (action === 'reject' && swap.targetId === userId) {
    await prisma.shiftSwap.update({ where: { id: params.id }, data: { targetAccepted: false, status: 'rejected' } })
    await createNotification(swap.requesterId, 'Swap Rejected ❌', `${swap.target.name} declined your shift swap request.`, 'error')
    return NextResponse.json({ ok: true })
  }

  // Admin approving/rejecting
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'admin_approve') {
    await prisma.shiftSwap.update({ where: { id: params.id }, data: { adminApproved: 'approved', status: 'approved' } })

    // Update timetable entries for both users — flagged as one-off overrides (via
    // markTimetableRange) so this specific-date swap doesn't get carried forward as if it
    // were a permanent change to either person's recurring schedule.
    const swapDateObj = new Date(swap.swapDate)
    await Promise.all([
      markTimetableRange(swap.requesterId, swapDateObj, swapDateObj, swap.targetShift),
      markTimetableRange(swap.targetId, swapDateObj, swapDateObj, swap.requesterShift),
    ])

    await Promise.all([
      createNotification(swap.requesterId, 'Shift Swap Approved ✅', `Your shift swap with ${swap.target.name} on ${swapDateObj.toLocaleDateString()} has been approved. You'll now cover ${swap.targetShift} that day — check the Timetable.`, 'success'),
      createNotification(swap.targetId, 'Shift Swap Approved ✅', `Your shift swap with ${swap.requester.name} on ${swapDateObj.toLocaleDateString()} has been approved. You'll now cover ${swap.requesterShift} that day — check the Timetable.`, 'success'),
    ])
    return NextResponse.json({ ok: true })
  }

  if (action === 'admin_reject') {
    await prisma.shiftSwap.update({ where: { id: params.id }, data: { adminApproved: 'rejected', status: 'rejected' } })
    await Promise.all([
      createNotification(swap.requesterId, 'Shift Swap Rejected ❌', `Admin rejected the shift swap with ${swap.target.name}.`, 'error'),
      createNotification(swap.targetId, 'Shift Swap Rejected ❌', `Admin rejected the shift swap with ${swap.requester.name}.`, 'error'),
    ])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
