
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  const totalSessions = await prisma.trackingSession.count()
  const sessionsWithTenant = await prisma.trackingSession.count({ where: { NOT: { tenantId: null } } })
  const sessionsWithProject = await prisma.trackingSession.count({ where: { NOT: { projectId: null } } })
  const totalEvents = await prisma.trackingEvent.count()
  
  console.log({
    totalSessions,
    sessionsWithTenant,
    sessionsWithProject,
    totalEvents
  })
  
  const lastSessions = await prisma.trackingSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log('Last sessions:', JSON.stringify(lastSessions, null, 2))

  const lastEvents = await prisma.trackingEvent.findMany({
    orderBy: { id: 'desc' },
    take: 5
  })
  console.log('Last events:', JSON.stringify(lastEvents, null, 2))

  await prisma.$disconnect()
}

main()
