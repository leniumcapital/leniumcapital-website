import { spawnSync } from "node:child_process";

function run(command, args, { optional = false } = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    if (optional) {
      console.warn(
        `[build] Optional step failed (${command} ${args.join(" ")}). Continuing.`,
      );
      return false;
    }
    process.exit(result.status ?? 1);
  }

  return true;
}

// Client generation does not require a live database.
run("npx", ["prisma", "generate"]);

const hasDb =
  process.env.POSTGRES_PRISMA_URL && process.env.POSTGRES_URL_NON_POOLING;

if (hasDb) {
  const pushed = run("npx", ["prisma", "db", "push", "--skip-generate"], {
    optional: true,
  });
  if (pushed) {
    run("npx", ["tsx", "scripts/seed-icons.ts"], { optional: true });
  }
} else {
  console.warn(
    "[build] Database env vars missing — skipping prisma db push and icon seed.",
  );
}

run("npx", ["next", "build"]);
