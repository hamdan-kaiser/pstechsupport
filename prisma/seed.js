const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const employees = [
  { name: 'Admin User', email: 'admin@company.com', role: 'admin', shift: 'day', magicKey: '0000' },
  { name: 'Imran Ahmed', email: 'imran@company.com', shift: 'day', magicKey: '1234' },
  { name: 'Nasrumul Islam', email: 'nasrumul@company.com', shift: 'night', magicKey: '5678' },
  { name: 'Sarah Johnson', email: 'sarah@company.com', shift: 'day', magicKey: '2468' },
  { name: 'Mohammed Ali', email: 'mohammed@company.com', shift: 'night', magicKey: '1357' },
  { name: 'Priya Patel', email: 'priya@company.com', shift: 'day', magicKey: '9012' },
  { name: 'James Wilson', email: 'james@company.com', shift: 'night', magicKey: '3456' },
]

async function main() {
  const defaultPassword = process.env.SEED_PASSWORD || 'password123'
  for (const emp of employees) {
    const hashed = await bcrypt.hash(defaultPassword, 10)
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: { ...emp, password: hashed, totalHolidays: 28, usedHolidays: 0 },
    })
  }
  console.log('Seeded', employees.length, 'users')
}

main().catch(console.error).finally(() => prisma.$disconnect())
