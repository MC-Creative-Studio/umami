import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const password = process.env.SEASONALYTICS_ADMIN_PASSWORD;
const schema = connectionString && new URL(connectionString).searchParams.get('schema');

// Keep the managed-site inventory in the private hosting environment.
const sites = process.env.SEASONALYTICS_WEBSITES
  ? JSON.parse(process.env.SEASONALYTICS_WEBSITES)
  : [
      {
        id: 'fdbb6d50-69f0-4a16-b509-42187da42eb1',
        name: 'Portfolio — giaquinto.dev',
        domain: 'giaquinto.dev',
      },
    ];

if (
  !Array.isArray(sites) ||
  sites.some(
    site =>
      !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(site.id) || !site.name || !site.domain,
  ) ||
  new Set(sites.map(site => site.id)).size !== sites.length
) {
  throw new Error('SEASONALYTICS_WEBSITES must contain unique website IDs, names and domains.');
}

if (schema !== 'umami') {
  throw new Error('Seasonalytics requires a dedicated umami database schema.');
}

const archivedIds = JSON.parse(process.env.SEASONALYTICS_ARCHIVED_WEBSITE_IDS || '[]');
if (
  !Array.isArray(archivedIds) ||
  archivedIds.some(
    id => typeof id !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id),
  )
) {
  throw new Error('SEASONALYTICS_ARCHIVED_WEBSITE_IDS must contain valid website IDs.');
}
if (sites.some(site => archivedIds.includes(site.id))) {
  throw new Error('Archived website IDs must not include active registry entries.');
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

      // Soft-archive only this administrator's explicitly excluded entries.
      // Keep analytics history so the action can be reversed without data loss.
      if (archivedIds.length) {
        await tx.website.updateMany({
          where: { id: { in: archivedIds }, userId: admin.id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }

      for (const site of sites) {
        await tx.website.upsert({
          where: { id: site.id },
          update: {},
          create: {
            id: site.id,
            name: site.name,
            domain: site.domain,
            userId: admin.id,
            createdBy: admin.id,
            recorderEnabled: false,
          },
        });
      }
    },
    { timeout: 30000 },
  );

  console.log(
    `Seasonalytics initialized. Default administrator secured; ${sites.length} websites registered.`,
  );
} finally {
  await prisma.$disconnect();
}
