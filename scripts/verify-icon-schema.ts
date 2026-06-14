import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw<
    { column_name: string }[]
  >`SELECT column_name FROM information_schema.columns WHERE table_name = 'icon_mappings' ORDER BY ordinal_position`;

  const indexes = await prisma.$queryRaw<
    { indexname: string }[]
  >`SELECT indexname FROM pg_indexes WHERE tablename = 'icon_mappings'`;

  const count = await prisma.iconMapping.count();

  console.log("Columns:", rows.map((r) => r.column_name).join(", "));
  console.log("Indexes:", indexes.map((i) => i.indexname).join(", "));
  console.log("Row count:", count);

  const required = [
    "id",
    "name_key",
    "display_name",
    "image_url",
    "category",
    "source",
    "is_verified",
    "fail_count",
    "is_invalidated",
    "created_at",
    "updated_at",
  ];
  const found = new Set(rows.map((r) => r.column_name));
  const missing = required.filter((c) => !found.has(c));
  if (missing.length) {
    console.error("Missing columns:", missing.join(", "));
    process.exit(1);
  }
  if (count < 300) {
    console.error(`Expected at least 300 rows, found ${count}`);
    process.exit(1);
  }
  console.log("icon_mappings schema and seed verified.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
