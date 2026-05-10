import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Ensure roles exist
  const clientRole = await prisma.role.upsert({
    where: { name: 'CLIENT' },
    create: { name: 'CLIENT', description: 'Standard bank customer' },
    update: {},
  });
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    create: { name: 'ADMIN', description: 'Bank administrator' },
    update: {},
  });

  const email = 'demo@bank.local';
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      roles: { connect: { id: clientRole.id } },
    },
    update: {
      passwordHash,
      isActive: true,
      roles: { connect: { id: clientRole.id } },
    },
  });

  const profile = await prisma.customerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullLegalName: 'Demo Customer',
      kycStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    update: {
      kycStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });

  // Admin user
  const adminEmail = 'admin@bank.local';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      roles: { connect: { id: adminRole.id } },
    },
    update: {
      passwordHash,
      isActive: true,
      roles: { connect: { id: adminRole.id } },
    },
  });

  const sourceIban = 'RO49BKCH0000000011110001';
  const destIban = 'RO49BKCH0000000022220002';

  const sourceAccount = await prisma.account.upsert({
    where: { iban: sourceIban },
    create: {
      customerId: profile.id,
      iban: sourceIban,
      currency: 'RON',
      accountType: 'CHECKING',
      availableBalance: 50_000,
    },
    update: {
      availableBalance: 50_000,
      status: 'ACTIVE',
      closedAt: null,
    },
  });

  const destAccount = await prisma.account.upsert({
    where: { iban: destIban },
    create: {
      customerId: profile.id,
      iban: destIban,
      currency: 'RON',
      accountType: 'SAVINGS',
      availableBalance: 0,
    },
    update: {
      status: 'ACTIVE',
      closedAt: null,
    },
  });

  console.log(`Seeded user ${email} (password: ${password})`);
  console.log(`Seeded admin ${adminEmail} (password: ${password})`);
  console.log(`SOURCE_ACCOUNT_ID=${sourceAccount.id}`);
  console.log(`DEST_ACCOUNT_ID=${destAccount.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
