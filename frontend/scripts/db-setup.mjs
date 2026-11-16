// Creates and initialises the PostgreSQL database the app actually uses
// (DATABASE_URL in frontend/.env.local), so the schema always lands on
// the same server the Next.js API connects to.
//
//   npm run db:setup            create DB + schema + sample data if missing,
//                               then (re)apply advanced_features.sql
//   npm run db:setup -- --reset DROP and rebuild the public schema
//   npm run db:setup -- --no-sample-data
//   npm run db:setup -- --dummy-data   also load ~50-60 fictional rows per
//                                      table (sql/dummy_data.sql)
//
// Optional: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (and optionally
// SEED_ADMIN_USERNAME) to create or update a loginable Admin account.

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(here, "..", "..", "sql");
const args = new Set(process.argv.slice(2));
const reset = args.has("--reset");
const loadSampleData = !args.has("--no-sample-data");
const loadDummyData = args.has("--dummy-data");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Define it in frontend/.env.local.");
  process.exit(1);
}

const target = new URL(connectionString);
const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));

async function readSql(file) {
  return readFile(path.join(sqlDir, file), "utf8").then((s) =>
    s.replace(/^﻿/, "")
  );
}

async function ensureDatabaseExists() {
  const probe = new pg.Client({ connectionString });
  try {
    await probe.connect();
    await probe.end();
    return;
  } catch (error) {
    if (error.code !== "3D000") throw error; // 3D000 = database does not exist
  }

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  console.log(`Creating database "${databaseName}"...`);
  await admin.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
  await admin.end();
}

async function seedAdmin(client) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;

  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const { default: argon2 } = await import("argon2");
  const hash = await argon2.hash(password);

  const result = await client.query(
    `INSERT INTO public.app_user
       (username, email, password_hash, role_id, is_active, approval_status)
     SELECT $1, $2, $3, role_id, TRUE, 'approved'
     FROM public.role WHERE role_name = 'Admin'
     ON CONFLICT (username) DO UPDATE
       SET email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role_id = EXCLUDED.role_id,
           is_active = TRUE,
           approval_status = 'approved'
     RETURNING user_id`,
    [username, email, hash]
  );

  if (result.rowCount === 0) {
    console.warn("No 'Admin' role found; admin account was not created.");
  } else {
    console.log(`Admin account "${username}" (${email}) is ready.`);
  }
}

async function main() {
  await ensureDatabaseExists();

  const client = new pg.Client({ connectionString });
  await client.connect();

  const info = await client.query(
    "SELECT current_database() AS db, inet_server_port() AS port, version() AS version"
  );
  const { db, port, version } = info.rows[0];
  console.log(`Connected to ${target.hostname}:${port}/${db}`);
  console.log(`Server: ${version.split(",")[0]}`);

  try {
    if (reset) {
      console.log("--reset: dropping and recreating schema public...");
      await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
    }

    const existing = await client.query(
      "SELECT to_regclass('public.sample') IS NOT NULL AS present"
    );

    if (existing.rows[0].present) {
      console.log("Schema already present; skipping schema.sql and sample_data.sql.");
    } else {
      console.log("Applying schema.sql...");
      await client.query(await readSql("schema.sql"));
      // schema.sql clears search_path for the session; restore it.
      await client.query("SET search_path TO public");

      if (loadSampleData) {
        console.log("Applying sample_data.sql...");
        await client.query(await readSql("sample_data.sql"));
      }
    }

    console.log("Applying advanced_features.sql...");
    await client.query(await readSql("advanced_features.sql"));

    // Apply idempotent migrations in filename order.
    const migrations = (await readdir(path.join(sqlDir, "migrations")).catch(() => []))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of migrations) {
      console.log(`Applying migrations/${file}...`);
      await client.query(await readSql(path.join("migrations", file)));
    }

    await seedAdmin(client);

    if (loadDummyData) {
      const loaded = await client.query(
        "SELECT 1 FROM public.researcher WHERE email LIKE '%@biobank-demo.example' LIMIT 1"
      );
      if (loaded.rowCount) {
        console.log("Dummy data already loaded; skipping dummy_data.sql.");
      } else {
        console.log("Applying dummy_data.sql...");
        await client.query(await readSql("dummy_data.sql"));
      }
    }

    const tables = await client.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    console.log(`Done. ${tables.rows[0].n} tables in public schema.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exit(1);
});
