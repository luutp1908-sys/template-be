const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASS || 'changeme123';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

  const existing = await p.user.findFirst({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log('User already exists:', existing.id, existing.email);
    // Ensure role assigned
    const adminRole = await p.role.findFirst({ where: { key: 'admin', deletedAt: null } });
    if (!adminRole) throw new Error('admin role not found; run role migration');
    const hasRole = await p.userRole.findFirst({ where: { userId: existing.id, roleId: adminRole.id } });
    if (!hasRole) {
      await p.userRole.create({ data: { userId: existing.id, roleId: adminRole.id } });
      console.log('Assigned admin role to existing user');
    }
    await p.$disconnect();
    return;
  }

  const hash = await bcrypt.hash(password, rounds);
  const user = await p.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: hash,
      displayName: 'Admin',
      isActive: true,
    },
  });

  const role = await p.role.findFirst({ where: { key: 'admin', deletedAt: null } });
  if (!role) {
    throw new Error('admin role not found; run role migration first');
  }

  await p.userRole.create({ data: { userId: user.id, roleId: role.id, workspaceId: null, teamId: null } });

  console.log('Created admin user:', { id: user.id, email: user.email });
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
