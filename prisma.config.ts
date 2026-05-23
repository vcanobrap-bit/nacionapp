import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Usamos DIRECT_URL para migraciones (conexión directa, sin pooler)
    // y DATABASE_URL para las queries en runtime.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]!,
  },
});
