
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const user = await prisma.user.findUnique({
    where: { email: 'lucasarchanjo1010@gmail.com' }
  })

  if (user) {
    const tenant = await prisma.tenant.findFirst()
    if (tenant) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id }
      })
      console.log(`User ${user.email} associated with tenant ${tenant.name}`)
    } else {
      console.log('No tenants found')
    }
  } else {
    console.log('User not found')
  }
  await prisma.$disconnect()
}

main()
