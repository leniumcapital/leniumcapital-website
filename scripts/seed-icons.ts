import { PrismaClient } from "@prisma/client";
import { ICON_SEED_DATA } from "../src/lib/icon-seed-data";
import { normalizeNameKey } from "../src/lib/icon-keys";

const prisma = new PrismaClient();

async function main() {
  let inserted = 0;
  let skipped = 0;

  for (const entry of ICON_SEED_DATA) {
    const nameKey = normalizeNameKey(entry.name);
    if (!nameKey || !entry.image_url) {
      skipped++;
      continue;
    }

    const existing = await prisma.iconMapping.findUnique({
      where: {
        nameKey_category: { nameKey, category: entry.category },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.iconMapping.create({
      data: {
        nameKey,
        displayName: entry.name,
        imageUrl: entry.image_url,
        category: entry.category,
        source: entry.source,
        isVerified: true,
      },
    });
    inserted++;
  }

  console.log(`Icon seed complete: ${inserted} inserted, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
