const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const prisma = new PrismaClient();

async function test() {
  const project = await prisma.project.findFirst({
    where: { slug: 'residencial-paranapanema' },
    include: { aiConfig: true }
  });

  if (!project || !project.aiConfig) {
    console.error('No project or AI config found');
    return;
  }

  console.log('Using Key:', project.aiConfig.apiKey.substring(0, 10) + '...');
  
  const openai = new OpenAI({ apiKey: project.aiConfig.apiKey });
  try {
    const res = await openai.chat.completions.create({
      model: project.aiConfig.model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'Test' }, { role: 'user', content: 'Hello' }]
    });
    console.log('OPENAI SUCCESS:', res.choices[0].message.content);
  } catch (e) {
    console.error('OPENAI ERROR:', e.message);
    if (e.response) {
      console.error('RESPONSE:', JSON.stringify(e.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

test();
