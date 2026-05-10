import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@bank.local';
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
    },
    update: {
      passwordHash,
      isActive: true,
    },
  });

  const profile = await prisma.customerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullLegalName: 'Demo Customer',
    },
    update: {},
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
