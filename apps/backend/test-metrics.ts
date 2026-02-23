
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const tenantId = 'cmlyggy740000v9w8k90o5b9x'
  
  const whereSession = {
    tenantId,
  }

  const [
    totalSessions,
    totalPageViews,
    totalLotClicks,
    totalRealtorClicks,
  ] = await Promise.all([
    prisma.trackingSession.count({ where: whereSession }),
    prisma.trackingEvent.count({
      where: { type: 'PAGE_VIEW', session: whereSession },
    }),
    prisma.trackingEvent.count({
      where: { type: 'CLICK', category: 'LOT', session: whereSession },
    }),
    prisma.trackingEvent.count({
      where: { type: 'CLICK', category: 'REALTOR_LINK', session: whereSession },
    }),
  ])

  console.log('Metrics result:', {
    totalSessions,
    totalPageViews,
    totalLotClicks,
    totalRealtorClicks,
  })

  await prisma.$disconnect()
}

main()
