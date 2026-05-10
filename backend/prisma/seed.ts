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

  const adminProfile = await prisma.customerProfile.upsert({
    where: { userId: adminUser.id },
    create: {
      userId: adminUser.id,
      fullLegalName: 'Bank Admin',
      kycStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    update: {
      kycStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });

  const systemIban = 'RO00SYSBANK0000000000001';
  const systemAccount = await prisma.account.upsert({
    where: { iban: systemIban },
    create: {
      customerId: adminProfile.id,
      iban: systemIban,
      currency: 'RON',
      accountType: 'SETTLEMENT',
      availableBalance: 1_000_000_000,
      isSystem: true,
    },
    update: {
      isSystem: true,
    },
  });

  const extSystemIban = 'RO00EXTBANK0000000000001';
  const extSystemAccount = await prisma.account.upsert({
    where: { iban: extSystemIban },
    create: {
      customerId: adminProfile.id,
      iban: extSystemIban,
      currency: 'RON',
      accountType: 'EXTERNAL_SETTLEMENT',
      availableBalance: 0,
      isSystem: true,
    },
    update: {
      isSystem: true,
      accountType: 'EXTERNAL_SETTLEMENT',
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

  const card1Id = '11111111-1111-4111-1111-111111111111';
  await prisma.card.upsert({
    where: { id: card1Id },
    create: {
      id: card1Id,
      customerId: profile.id,
      accountId: sourceAccount.id,
      maskedPan: '**** **** **** 4242',
      cardType: 'DEBIT',
      status: 'ACTIVE',
    },
    update: {
      status: 'ACTIVE',
      blockedAt: null,
    },
  });

  const card2Id = '22222222-2222-4222-2222-222222222222';
  await prisma.card.upsert({
    where: { id: card2Id },
    create: {
      id: card2Id,
      customerId: profile.id,
      accountId: destAccount.id,
      maskedPan: '**** **** **** 1234',
      cardType: 'VIRTUAL',
      status: 'ACTIVE',
    },
    update: {
      status: 'ACTIVE',
      blockedAt: null,
    },
  });

  console.log(`Seeded user ${email} (password: ${password})`);
  console.log(`Seeded admin ${adminEmail} (password: ${password})`);
  console.log(`SOURCE_ACCOUNT_ID=${sourceAccount.id}`);
  console.log(`DEST_ACCOUNT_ID=${destAccount.id}`);
  console.log(`SYSTEM_ACCOUNT_ID=${systemAccount.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
