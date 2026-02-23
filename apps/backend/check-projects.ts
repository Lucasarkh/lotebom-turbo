
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const tenantId = 'cmlyggy740000v9w8k90o5b9x'
  const projects = await prisma.project.findMany({ where: { tenantId } })
  console.log('Projects:', JSON.stringify(projects.map(p => ({ id: p.id, name: p.name, slug: p.slug })), null, 2))
  await prisma.$disconnect()
}

main()
