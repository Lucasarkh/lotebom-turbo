const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.trackingSession.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 5,
    select: { id: true, tenantId: true, projectId: true, createdAt: true, lastSeenAt: true, utmSource: true }
  });
  console.log('=== RECENT SESSIONS ===');
  sessions.forEach(s => console.log(JSON.stringify(s)));

  const events = await prisma.trackingEvent.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5,
    select: { id: true, sessionId: true, type: true, label: true, path: true, timestamp: true }
  });
  console.log('\n=== RECENT EVENTS ===');
  events.forEach(e => console.log(JSON.stringify(e)));

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('\n=== TENANTS ===');
  tenants.forEach(t => console.log(JSON.stringify(t)));

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, tenantId: true }
  });
  console.log('\n=== PROJECTS ===');
  projects.forEach(p => console.log(JSON.stringify(p)));

  const totalSessions = await prisma.trackingSession.count();
  const totalEvents = await prisma.trackingEvent.count();
  console.log('\n=== TOTALS: ' + totalSessions + ' sessions, ' + totalEvents + ' events ===');

  await prisma.$disconnect();
}

main();
