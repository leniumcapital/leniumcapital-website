import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_ACCOUNTS = [
  {
    email: "trader@lenium.capital",
    password: "demo1234",
    name: "Demo Trader",
    account: {
      accountType: "challenge",
      tier: 25000,
      balance: 26840,
      challengeStatus: "in_progress",
    },
  },
  {
    email: "funded@lenium.capital",
    password: "demo1234",
    name: "Funded Pro",
    account: {
      accountType: "funded",
      tier: 50000,
      balance: 52840,
      challengeStatus: "funded",
    },
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
        accounts: {
          create: {
            accountType: demo.account.accountType,
            tier: demo.account.tier,
            balance: demo.account.balance,
            challengeStatus: demo.account.challengeStatus,
            isPrimary: true,
          },
        },
      },
      include: { accounts: true },
    });

    const hasAccount = user.accounts.length > 0;
    if (!hasAccount) {
      await prisma.tradingAccount.create({
        data: {
          userId: user.id,
          ...demo.account,
          isPrimary: true,
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
