
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'lucas' } }
  })
  console.log('User Lucas:', JSON.stringify(user, null, 2))
  await prisma.$disconnect()
}

main()
