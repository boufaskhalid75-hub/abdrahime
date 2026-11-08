/**
 * Database test harness.
 * Creates a fresh database on a plain PostgreSQL server, installs a minimal
 * Supabase shim (auth.uid(), roles) and applies every migration in order.
 * Each call runs in its own transaction as the `authenticated` role with the
 * JWT `sub` claim set — exactly like PostgREST does for the real app.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";

const ROOT = join(__dirname, "..", "..");
export const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL ?? "";

export function dbAvailable() {
  return ADMIN_URL.length > 0;
}

export class TestDb {
  pool!: pg.Pool;
  dbName = `vm_test_${process.pid}_${Math.floor(Math.random() * 1e6)}`;

  async setup() {
    const admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`create database ${this.dbName}`);
    await admin.end();
    const url = new URL(ADMIN_URL);
    url.pathname = `/${this.dbName}`;
    this.pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
    const shim = readFileSync(join(ROOT, "supabase/tests/supabase_shim.sql"), "utf8");
    await this.pool.query(shim);
    const dir = join(ROOT, "supabase/migrations");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await this.pool.query(readFileSync(join(dir, f), "utf8"));
    }
  }

  async teardown() {
    await this.pool?.end();
    const admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${this.dbName} with (force)`);
    await admin.end();
  }

  async createUser(email = `${randomUUID()}@test.local`) {
    const id = randomUUID();
    await this.pool.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    await this.as(id, "select public.ensure_owner_setup()");
    return id;
  }

  /** Run a query as the given user (null => anon) inside its own transaction. */
  async as<T extends pg.QueryResultRow = any>(userId: string | null, sql: string, params: unknown[] = []) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      if (userId) {
        await client.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: userId, role: "authenticated" }),
        ]);
        await client.query("set local role authenticated");
      } else {
        await client.query("set local role anon");
      }
      const res = await client.query<T>(sql, params);
      await client.query("commit");
      return res;
    } catch (e) {
      await client.query("rollback").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async one<T extends pg.QueryResultRow = any>(userId: string | null, sql: string, params: unknown[] = []) {
    const r = await this.as<T>(userId, sql, params);
    return r.rows[0];
  }

  /** Superuser query (bypasses RLS) used only to inspect invariants. */
  async admin<T extends pg.QueryResultRow = any>(sql: string, params: unknown[] = []) {
    return (await this.pool.query<T>(sql, params)).rows;
  }
}

export const n = (v: unknown) => Number(v);
