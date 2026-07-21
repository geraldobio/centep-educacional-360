import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type D1Binding = Parameters<typeof drizzle>[0];

let database: D1Binding | undefined;

export function setD1Database(binding: D1Binding | undefined) {
  database = binding;
}

export function getDb() {
  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(database, { schema });
}
