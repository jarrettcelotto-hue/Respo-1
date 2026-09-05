import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

// Prisma 7 config: used by the CLI (migrate/generate/studio). The running
// app itself still connects via the driver adapter in src/lib/prisma.ts --
// this file only tells the CLI where to find the schema and how to reach
// the database for migrations.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
