import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbClient = ReturnType<typeof postgres>;
type Drizzle = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  pgClient?: DbClient;
  drizzleDb?: Drizzle;
};

function getClient(): DbClient {
  if (globalForDb.pgClient) return globalForDb.pgClient;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Setze sie in deiner .env oder als Dokploy-Service-Variable.",
    );
  }
  const max = Number.parseInt(process.env.DB_POOL_MAX ?? "5", 10);
  const client = postgres(url, {
    max: Number.isFinite(max) && max > 0 ? max : 5,
    prepare: false,
  });
  if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;
  return client;
}

export const db: Drizzle = new Proxy({} as Drizzle, {
  get(_t, prop) {
    if (!globalForDb.drizzleDb) {
      globalForDb.drizzleDb = drizzle(getClient(), { schema });
    }
    return Reflect.get(globalForDb.drizzleDb as object, prop);
  },
});
