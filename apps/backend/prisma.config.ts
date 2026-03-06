import "dotenv/config";
import path from "path";
import type { PrismaConfig } from "prisma";

export default {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations")
  }
} satisfies PrismaConfig;