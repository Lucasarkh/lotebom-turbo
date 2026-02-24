
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const users = await prisma.user.findMany({
    include: { tenant: true }
  })
  console.log('All Users:', JSON.stringify(users.map(u => ({
    email: u.email,
    role: u.role,
    tenantId: u.tenantId,
    tenantName: u.tenant?.name
  })), null, 2))
  await prisma.$disconnect()
}

main()
