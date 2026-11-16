import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const password = process.env.SEASONALYTICS_ADMIN_PASSWORD;
const schema = connectionString && new URL(connectionString).searchParams.get('schema');

if (schema !== 'umami') {
  throw new Error('Seasonalytics requires a dedicated umami database schema.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }, { schema }),
});

try {
  await prisma.$transaction(
    async tx => {
      const admin = await tx.user.findUnique({ where: { username: 'admin' } });
      if (!admin || admin.deletedAt || admin.role !== 'admin') {
        throw new Error('The initial Umami administrator could not be verified.');
      }

      // Replace the upstream default before Netlify can publish the application.
      if (await bcrypt.compare('umami', admin.password)) {
        if (!password || password.length < 16 || password === 'replace-me-with-a-password') {
          throw new Error('Set SEASONALYTICS_ADMIN_PASSWORD to at least 16 characters.');
        }
        await tx.user.update({
          where: { id: admin.id },
          data: { password: await bcrypt.hash(password, 12) },
        });
      }

      await tx.website.upsert({
        where: { id: 'fdbb6d50-69f0-4a16-b509-42187da42eb1' },
        update: {},
        create: {
          id: 'fdbb6d50-69f0-4a16-b509-42187da42eb1',
          name: 'Portfolio — giaquinto.dev',
          domain: 'giaquinto.dev',
          userId: admin.id,
          createdBy: admin.id,
          recorderEnabled: false,
        },
      });
    },
    { timeout: 30000 },
  );

  console.log('Seasonalytics initialized. Default administrator secured; portfolio registered.');
} finally {
  await prisma.$disconnect();
}
