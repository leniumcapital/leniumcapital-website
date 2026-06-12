import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Supabase pooler URLs from the Vercel integration often omit ?pgbouncer=true,
 * which breaks Prisma on serverless. Append it when using the pooler host.
 */
function pooledDatabaseUrl(): string | undefined {
  const url = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("pgbouncer=true")) return url;
  if (url.includes("pooler.supabase.com") || url.includes(":6543")) {
    return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  }
  return url;
}

const datasourceUrl = pooledDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl
      ? { datasources: { db: { url: datasourceUrl } } }
      : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
