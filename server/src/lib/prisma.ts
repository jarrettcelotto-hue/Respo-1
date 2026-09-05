import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../env";

// Prisma 7 connects through an explicit driver adapter rather than a `url`
// in schema.prisma (that property is CLI/migration-only now -- see
// prisma.config.ts).
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

// Single shared Prisma client for the whole process (API server or worker).
export const prisma = new PrismaClient({ adapter });
