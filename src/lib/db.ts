import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Supabase pooler URLs from the Vercel integration often omit ?pgbouncer=true,
 * which breaks Prisma on serverless. Append it when using the pooler host.
 */
function pooledDatabaseUrl(): string | undefined {
  const url = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("pooler.supabase.com") || url.includes(":6543")) {
    const params = new URLSearchParams(
      url.includes("?") ? url.split("?")[1] : "",
    );
    if (!params.has("pgbouncer")) params.set("pgbouncer", "true");
    if (!params.has("connection_limit")) params.set("connection_limit", "1");
    if (!params.has("sslmode")) params.set("sslmode", "require");
    const base = url.split("?")[0];
    return `${base}?${params.toString()}`;
  }
  if (url.includes("pgbouncer=true")) return url;
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
