
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const tenants = await prisma.tenant.findMany()
  console.log('Tenants:', JSON.stringify(tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })), null, 2))
  await prisma.$disconnect()
}

main()
