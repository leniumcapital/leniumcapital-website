import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_ACCOUNTS = [
  {
    email: "trader@lenium.capital",
    password: "demo1234",
    name: "Demo Trader",
    accounts: [
      {
        accountType: "challenge",
        tier: 25000,
        balance: 26840,
        challengeStatus: "in_progress",
        isPrimary: true,
      },
      {
        accountType: "funded",
        tier: 50000,
        balance: 52840,
        challengeStatus: "funded",
        isPrimary: false,
      },
    ],
  },
  {
    email: "funded@lenium.capital",
    password: "demo1234",
    name: "Funded Pro",
    accounts: [
      {
        accountType: "funded",
        tier: 50000,
        balance: 52840,
        challengeStatus: "funded",
        isPrimary: true,
      },
    ],
  },
] as const;

async function main() {
  for (const demo of DEMO_ACCOUNTS) {
    const hash = await bcrypt.hash(demo.password, 12);
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: { name: demo.name, password: hash },
      create: {
        email: demo.email,
        name: demo.name,
        password: hash,
      },
    });

    for (const account of demo.accounts) {
      await prisma.tradingAccount.upsert({
        where: {
          userId_accountType: {
            userId: user.id,
            accountType: account.accountType,
          },
        },
        update: {
          tier: account.tier,
          balance: account.balance,
          challengeStatus: account.challengeStatus,
          isPrimary: account.isPrimary,
        },
        create: {
          userId: user.id,
          accountType: account.accountType,
          tier: account.tier,
          balance: account.balance,
          challengeStatus: account.challengeStatus,
          isPrimary: account.isPrimary,
        },
      });
    }

    console.log(`Seeded ${demo.email}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
